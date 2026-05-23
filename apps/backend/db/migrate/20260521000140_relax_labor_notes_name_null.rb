class RelaxLaborNotesNameNull < ActiveRecord::Migration[7.1]
  def change
    change_column_null :labor_notes, :name, true
  end
end
