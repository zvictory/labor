slugs = ['another-13', 'gumin', 'herod', 'french-lover', 'guidance', 'oud-satin-mood-maison']
products = Spree::Product.where(slug: slugs)
products.each do |product|
  if product.master.images.any?
    puts "Deleting #{product.master.images.size} image(s) for #{product.slug}"
    product.master.images.destroy_all
  else
    puts "No images to delete for #{product.slug}"
  end
end
