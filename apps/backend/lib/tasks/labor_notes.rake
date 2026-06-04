# frozen_string_literal: true

# labor:notes:apply_translations — writes ru/en/uz Mobility values for the
# Labor::Note rows from db/data/note_translations.yml. Unknown slugs are
# reported but do not abort the task. Idempotent: re-runs overwrite values
# only when they differ from the YAML source of truth.

require 'yaml'

namespace :labor do
  namespace :notes do
    LOCALES = %i[en ru uz].freeze

    desc 'Apply curated 4-locale note name translations via Mobility'
    task apply_translations: :environment do
      yaml_path = Rails.root.join('db', 'data', 'note_translations.yml')
      raise "missing #{yaml_path}" unless yaml_path.exist?

      data = YAML.safe_load_file(yaml_path)
      raise 'note_translations.yml must be a hash of slug => locale-map' unless data.is_a?(Hash)

      updated  = 0
      skipped  = 0
      unknown  = []
      missing  = []

      data.each do |slug, locale_map|
        note = Labor::Note.find_by(slug: slug)
        unless note
          unknown << slug
          next
        end

        changed = false
        LOCALES.each do |loc|
          desired = locale_map[loc.to_s]
          if desired.nil? || desired.to_s.empty?
            missing << "#{slug}.#{loc}"
            next
          end
          current = Mobility.with_locale(loc) { note.name }
          next if current == desired

          Mobility.with_locale(loc) { note.name = desired }
          changed = true
        end

        if changed
          note.save!
          updated += 1
          puts "  + updated #{slug}"
        else
          skipped += 1
        end
      end

      puts ''
      puts "DONE  updated=#{updated}  unchanged=#{skipped}  unknown_slugs=#{unknown.size}  missing_translations=#{missing.size}"
      unless unknown.empty?
        puts "  unknown slugs (no Labor::Note row):"
        unknown.each { |s| puts "    · #{s}" }
      end
      unless missing.empty?
        puts "  missing translations (first 20):"
        missing.first(20).each { |m| puts "    · #{m}" }
      end
    end

    desc 'Set Labor::Note.icon_url from tmp/notes_harvest.json (fimgs sastojci)'
    task apply_icons: :environment do
      require 'json'

      path = ENV['NOTE_HARVEST'] || Rails.root.join('tmp', 'notes_harvest.json')
      raise "missing #{path}" unless File.exist?(path)

      rows = JSON.parse(File.read(path))
      raise 'notes_harvest.json must be an array' unless rows.is_a?(Array)

      updated = 0
      skipped = 0
      missing = []

      rows.each do |row|
        nid = row['id']
        url = row['icon_url'].to_s
        if url.empty?
          missing << nid
          next
        end
        note = Labor::Note.find_by(id: nid)
        unless note
          missing << nid
          next
        end
        if note.icon_url == url
          skipped += 1
          next
        end
        note.update!(icon_url: url)
        updated += 1
        puts "  + #{note.slug.ljust(28)} → #{url}"
      end

      puts ''
      puts "DONE  updated=#{updated}  unchanged=#{skipped}  missing=#{missing.size}"
      missing.first(20).each { |m| puts "  · missing id=#{m}" } if missing.any?
    end

    desc 'Show locale coverage and Cyrillic sanity check for ru notes'
    task audit_translations: :environment do
      rows = Labor::Note.order(:family, :slug).to_a
      cyr = /[Ѐ-ӿ]/
      bad_ru = []
      rows.each do |n|
        ru = Mobility.with_locale(:ru) { n.name }
        bad_ru << "#{n.slug}: ru=#{ru.inspect}" unless ru.to_s.match?(cyr)
      end
      puts "ru non-Cyrillic: #{bad_ru.size}"
      bad_ru.first(20).each { |b| puts "  · #{b}" }
      puts "total notes: #{rows.size}"
    end
  end
end
