# One-shot: merge by-kilian -> kilian, adopt 'By Kilian' as display name.
# Idempotent: if src already gone, exits without changes.
src = Labor::Brand.find_by(slug: 'by-kilian')
dst = Labor::Brand.find_by(slug: 'kilian')

if src.nil?
  puts 'no-op: by-kilian already absent'
  exit 0
end
abort 'missing destination brand kilian' unless dst

moved = 0
ActiveRecord::Base.transaction do
  moved = Labor::ProductFragranceDetail.where(labor_brand_id: src.id).update_all(labor_brand_id: dst.id)
  %i[country founded_year website logo_url].each do |attr|
    next unless dst.respond_to?(attr) && src.respond_to?(attr)
    dst[attr] = src[attr] if dst[attr].blank? && src[attr].present?
  end
  Mobility.with_locale(:en) { dst.name = 'By Kilian'; dst.save!(validate: false) }
  dst.save!(validate: false)
  src.destroy!
end

puts "merged: moved #{moved} fragrance-detail rows, removed brand #{src.slug}"
