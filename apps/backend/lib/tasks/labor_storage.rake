# frozen_string_literal: true

# labor:storage — Active Storage migration helpers.
#
# Workflow when flipping STORAGE_SERVICE from `local` to `amazon`:
#   1. Deploy code with STORAGE_SERVICE=amazon AND keep the local disk mounted.
#   2. Run `rake labor:storage:migrate_to_s3` (uploads all local blobs to S3).
#   3. Verify by hitting a few asset URLs in prod.
#   4. Once confident, run `rake labor:storage:purge_local` to free disk.
#
# Both tasks are idempotent — safe to re-run after partial failures.

namespace :labor do
  namespace :storage do
    desc 'Upload every ActiveStorage::Blob whose service_name=local to amazon (S3). Idempotent.'
    task migrate_to_s3: :environment do
      total = 0
      uploaded = 0
      skipped = 0
      failed = 0

      disk = ActiveStorage::Blob.services.fetch(:local)
      amazon = ActiveStorage::Blob.services.fetch(:amazon)

      scope = ActiveStorage::Blob.where(service_name: 'local')
      total = scope.count
      Rails.logger.info("[labor:storage] migrate_to_s3 starting — #{total} local blob(s) to migrate")

      scope.find_each(batch_size: 100) do |blob|
        ActiveRecord::Base.transaction do
          if blob.service_name == 'amazon'
            skipped += 1
            next
          end

          path = disk.send(:path_for, blob.key)
          unless File.exist?(path)
            Rails.logger.warn("[labor:storage] blob ##{blob.id} key=#{blob.key} missing on disk at #{path} — skipping")
            skipped += 1
            next
          end

          File.open(path, 'rb') do |io|
            amazon.upload(
              blob.key,
              io,
              checksum: blob.checksum,
              content_type: blob.content_type
            )
          end

          blob.update!(service_name: 'amazon')
          uploaded += 1
          Rails.logger.info("[labor:storage] uploaded blob ##{blob.id} key=#{blob.key} (#{uploaded}/#{total})")
        end
      rescue StandardError => e
        failed += 1
        Rails.logger.error("[labor:storage] blob ##{blob.id} key=#{blob.key} failed: #{e.class}: #{e.message}")
        # do not re-raise — continue with next blob
      end

      Rails.logger.info(
        "[labor:storage] migrate_to_s3 done — total=#{total} uploaded=#{uploaded} skipped=#{skipped} failed=#{failed}"
      )
      puts "[labor:storage] migrate_to_s3 done — total=#{total} uploaded=#{uploaded} skipped=#{skipped} failed=#{failed}"
    end

    # Alias
    desc 'Alias for labor:storage:migrate_to_s3.'
    task migrate: :migrate_to_s3

    desc 'Delete local on-disk copies of blobs that already live on amazon (S3). Idempotent.'
    task purge_local: :environment do
      total = 0
      deleted = 0
      missing = 0
      failed = 0

      disk = ActiveStorage::Blob.services.fetch(:local)
      scope = ActiveStorage::Blob.where(service_name: 'amazon')
      total = scope.count
      Rails.logger.info("[labor:storage] purge_local starting — #{total} amazon blob(s) to inspect")

      scope.find_each(batch_size: 100) do |blob|
        path = disk.send(:path_for, blob.key)
        if File.exist?(path)
          begin
            File.delete(path)
            deleted += 1
            Rails.logger.info("[labor:storage] deleted local copy of blob ##{blob.id} key=#{blob.key}")
          rescue StandardError => e
            failed += 1
            Rails.logger.error("[labor:storage] failed to delete #{path} for blob ##{blob.id}: #{e.class}: #{e.message}")
          end
        else
          missing += 1
        end
      end

      Rails.logger.info(
        "[labor:storage] purge_local done — total=#{total} deleted=#{deleted} already_gone=#{missing} failed=#{failed}"
      )
      puts "[labor:storage] purge_local done — total=#{total} deleted=#{deleted} already_gone=#{missing} failed=#{failed}"
    end
  end
end
