require 'rails_helper'

RSpec.describe Labor::CatalogImageQuality do
  def blob(width:, height:, filename: 'bottle.jpg')
    instance_double(
      ActiveStorage::Blob,
      filename: filename,
      metadata: { 'width' => width, 'height' => height },
    )
  end

  it 'marks missing images as missing with the target rule attached' do
    quality = described_class.call(nil)

    expect(quality).to include(
      status: 'missing',
      reasons: ['missing_image'],
      width: nil,
      height: nil,
      filename: nil,
      target: described_class::TARGET,
    )
  end

  it 'marks Fragrantica 375x500 images as not suitable because they are too small' do
    quality = described_class.call(blob(width: 375, height: 500, filename: '375x500.89720.jpg'))

    expect(quality).to include(
      status: 'not_suitable',
      width: 375,
      height: 500,
      filename: '375x500.89720.jpg',
      reasons: ['too_small'],
    )
  end

  it 'marks square images as not suitable because they do not match the shop card ratio' do
    quality = described_class.call(blob(width: 1024, height: 1024))

    expect(quality).to include(
      status: 'not_suitable',
      ratio: 1.0,
      reasons: ['bad_ratio'],
    )
  end

  it 'marks 750x1000 product images as suitable' do
    quality = described_class.call(blob(width: 750, height: 1000))

    expect(quality).to include(
      status: 'suitable',
      width: 750,
      height: 1000,
      ratio: 0.75,
      reasons: [],
    )
  end
end
