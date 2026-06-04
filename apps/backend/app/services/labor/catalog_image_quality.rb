module Labor
  class CatalogImageQuality
    TARGET = {
      width: 750,
      height: 1000,
      ratio: '3:4',
      minimum_width: 600,
      minimum_height: 800,
    }.freeze

    TARGET_RATIO = 0.75
    RATIO_TOLERANCE = 0.12

    def self.call(blob)
      new(blob).call
    end

    def initialize(blob)
      @blob = blob
    end

    def call
      return missing_payload unless blob

      reasons = []
      reasons << 'too_small' if too_small?
      reasons << 'bad_ratio' if bad_ratio?

      {
        status: reasons.empty? ? 'suitable' : 'not_suitable',
        width: width,
        height: height,
        ratio: ratio,
        filename: blob.filename.to_s,
        reasons: reasons,
        target: TARGET,
      }
    end

    private

    attr_reader :blob

    def missing_payload
      {
        status: 'missing',
        width: nil,
        height: nil,
        ratio: nil,
        filename: nil,
        reasons: ['missing_image'],
        target: TARGET,
      }
    end

    def width
      dimension('width')
    end

    def height
      dimension('height')
    end

    def dimension(key)
      value = blob.metadata[key] || blob.metadata[key.to_sym]
      value.to_i.positive? ? value.to_i : nil
    end

    def ratio
      return nil unless width && height

      (width.to_f / height).round(3)
    end

    def too_small?
      width.to_i < TARGET[:minimum_width] || height.to_i < TARGET[:minimum_height]
    end

    def bad_ratio?
      return true unless ratio

      (ratio - TARGET_RATIO).abs > RATIO_TOLERANCE
    end
  end
end
