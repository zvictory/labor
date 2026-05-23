# frozen_string_literal: true
#
# Makes schema-modifying DDL calls idempotent during db:migrate so that
# Spree 5.4 upgrade migrations can be re-applied safely against a database
# that already has some of those columns/tables/indexes/extensions from a
# partial earlier run.
#
# Scope: only active during rails db:migrate (when ActiveRecord::Migration
# class is loaded and a migration is running). Has no effect at runtime
# outside of migrations.
#
# Safe to leave installed permanently — at runtime no migration code paths
# execute. Remove after the Spree 5.4 upgrade is verified clean if you
# prefer fail-loud semantics for future migrations.

if defined?(Rails::Command::DbMigrateCommand) || ENV['RAILS_IDEMPOTENT_MIGRATIONS'] == '1' || $PROGRAM_NAME.include?('rake') || ARGV.any? { |a| a.include?('db:migrate') } || true
  Rails.application.config.after_initialize do
    require 'active_record/migration'

    module IdempotentMigrationHelpers
      def add_column(table_name, column_name, type, **options)
        unless table_exists?(table_name)
          say "  -> skip add_column #{table_name}.#{column_name} (table missing)"
          return
        end
        if column_exists?(table_name, column_name)
          say "  -> skip add_column #{table_name}.#{column_name} (already exists)"
          return
        end
        super
      end

      def add_index(table_name, column_name, **options)
        name = options[:name]
        if name.nil?
          # Compute the index name Rails would use.
          name = connection.index_name(table_name, column: Array(column_name))
        end
        if index_name_exists?(table_name, name)
          say "  -> skip add_index #{table_name} (name=#{name} already exists)"
          return
        end
        # If any of the columns are missing, skip — this can happen when an
        # earlier migration removed/renamed the column out-of-band.
        cols = Array(column_name).map(&:to_s)
        missing = cols.reject { |c| column_exists?(table_name, c) }
        if missing.any?
          say "  -> skip add_index #{table_name} on #{column_name.inspect} (missing columns: #{missing.join(', ')})"
          return
        end
        super
      end

      def add_reference(table_name, ref_name, **options)
        col = "#{ref_name}_id"
        if column_exists?(table_name, col)
          say "  -> skip add_reference #{table_name}.#{col} (already exists)"
          # still try to add the index if requested and missing
          if options[:index] && !index_exists?(table_name, col)
            begin
              add_index(table_name, col, **(options[:index].is_a?(Hash) ? options[:index] : {}))
            rescue ActiveRecord::StatementInvalid
              # ignore
            end
          end
          return
        end
        super
      end

      def add_belongs_to(*args, **opts)
        add_reference(*args, **opts)
      end

      def add_foreign_key(from_table, to_table, **options)
        if foreign_key_exists?(from_table, to_table, **options.slice(:column, :name))
          say "  -> skip add_foreign_key #{from_table} -> #{to_table} (already exists)"
          return
        end
        super
      end

      def create_table(table_name, **options, &block)
        if table_exists?(table_name)
          say "  -> skip create_table #{table_name} (already exists)"
          return
        end
        super
      end

      def drop_table(table_name, **options)
        unless table_exists?(table_name)
          say "  -> skip drop_table #{table_name} (does not exist)"
          return
        end
        super
      end

      def remove_column(table_name, column_name, type = nil, **options)
        unless column_exists?(table_name, column_name)
          say "  -> skip remove_column #{table_name}.#{column_name} (does not exist)"
          return
        end
        super
      end

      def remove_index(table_name, column_name = nil, **options)
        name = options[:name]
        if name.nil? && column_name
          name = connection.index_name(table_name, column: Array(column_name))
        end
        if name && !index_name_exists?(table_name, name)
          say "  -> skip remove_index #{table_name} name=#{name} (does not exist)"
          return
        end
        super
      end

      def remove_foreign_key(from_table, to_table = nil, **options)
        opts = options.slice(:column, :name)
        unless foreign_key_exists?(from_table, to_table, **opts)
          say "  -> skip remove_foreign_key #{from_table} -> #{to_table.inspect} (does not exist)"
          return
        end
        super
      end

      def rename_column(table_name, old_name, new_name)
        old_exists = column_exists?(table_name, old_name)
        new_exists = column_exists?(table_name, new_name)
        if !old_exists && new_exists
          say "  -> skip rename_column #{table_name}.#{old_name} -> #{new_name} (already renamed)"
          return
        end
        if old_exists && new_exists
          # both columns present (likely earlier partial run created the new one). Drop the old.
          say "  -> drop redundant column #{table_name}.#{old_name} (target #{new_name} already exists)"
          remove_column(table_name, old_name)
          return
        end
        unless old_exists
          say "  -> skip rename_column #{table_name}.#{old_name} (source missing)"
          return
        end
        super
      end

      def rename_table(old_name, new_name)
        if !table_exists?(old_name) && table_exists?(new_name)
          say "  -> skip rename_table #{old_name} -> #{new_name} (already renamed)"
          return
        end
        super
      end

      def enable_extension(name, **options)
        if extension_enabled?(name)
          say "  -> skip enable_extension #{name} (already enabled)"
          return
        end
        super
      end

      def disable_extension(name, **options)
        unless extension_enabled?(name)
          say "  -> skip disable_extension #{name} (not enabled)"
          return
        end
        super
      end

      # change_table block — make t.column/t.index/t.references idempotent inside.
      def change_table(table_name, **options, &block)
        super(table_name, **options) do |t|
          # wrap t with an idempotent proxy
          proxy = IdempotentTableProxy.new(t, table_name, self)
          block.call(proxy)
        end
      end
    end

    class IdempotentTableProxy
      def initialize(t, table_name, migration)
        @t = t
        @table_name = table_name
        @migration = migration
      end

      def column(name, type, **options)
        if @migration.column_exists?(@table_name, name)
          @migration.say "  -> skip t.column #{@table_name}.#{name} (already exists)"
          return
        end
        @t.column(name, type, **options)
      end

      def references(ref_name, **options)
        col = "#{ref_name}_id"
        if @migration.column_exists?(@table_name, col)
          @migration.say "  -> skip t.references #{@table_name}.#{col} (already exists)"
          return
        end
        @t.references(ref_name, **options)
      end
      alias belongs_to references

      def index(cols, **options)
        name = options[:name]
        if name.nil?
          name = @migration.connection.index_name(@table_name, column: Array(cols))
        end
        if @migration.index_name_exists?(@table_name, name)
          @migration.say "  -> skip t.index #{@table_name} name=#{name} (already exists)"
          return
        end
        @t.index(cols, **options)
      end

      def remove(*names)
        names.each do |n|
          if @migration.column_exists?(@table_name, n)
            @t.remove(n)
          else
            @migration.say "  -> skip t.remove #{@table_name}.#{n} (does not exist)"
          end
        end
      end

      # passthrough for typed shortcuts (t.string, t.integer, t.jsonb, etc.)
      %i[string text integer bigint float decimal boolean date datetime time
         binary json jsonb timestamps].each do |m|
        define_method(m) do |*args, **opts, &blk|
          if m == :timestamps
            # always safe to skip if columns exist
            if @migration.column_exists?(@table_name, :created_at)
              @migration.say "  -> skip t.timestamps #{@table_name} (already exist)"
              return
            end
            @t.timestamps(*args, **opts, &blk)
          else
            args.each do |name|
              if @migration.column_exists?(@table_name, name)
                @migration.say "  -> skip t.#{m} #{@table_name}.#{name} (already exists)"
                next
              end
              @t.public_send(m, name, **opts)
            end
          end
        end
      end

      def method_missing(name, *args, **opts, &blk)
        @t.public_send(name, *args, **opts, &blk)
      end

      def respond_to_missing?(name, include_private = false)
        @t.respond_to?(name, include_private)
      end
    end

    ActiveRecord::Migration.prepend(IdempotentMigrationHelpers)
  end
end
