# One-shot: merge francis-kurkdjian -> maison-francis-kurkdjian.
# Idempotent: if src is already gone, exits without changes.
src = Labor::Brand.find_by(slug: 'francis-kurkdjian')
dst = Labor::Brand.find_by(slug: 'maison-francis-kurkdjian')

if src.nil?
  puts 'no-op: francis-kurkdjian already absent'
  exit 0
end
abort 'missing destination brand maison-francis-kurkdjian' unless dst

moved = 0
ActiveRecord::Base.transaction do
  moved = Labor::ProductFragranceDetail.where(labor_brand_id: src.id).update_all(labor_brand_id: dst.id)
  %i[country founded_year website logo_url].each do |attr|
    next unless dst.respond_to?(attr) && src.respond_to?(attr)
    dst[attr] = src[attr] if dst[attr].blank? && src[attr].present?
  end
  dst.save!(validate: false)
  src.destroy!
end

puts "merged: moved #{moved} fragrance-detail rows, removed brand #{src.slug}"
