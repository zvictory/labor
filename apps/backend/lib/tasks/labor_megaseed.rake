# frozen_string_literal: true

# labor:megaseed — idempotent bulk seeding of brands, notes, perfumers and
# ~1000 perfume products. Safe to re-run.
#
# Usage:
#   docker exec labor-backend-1 bin/rake labor:megaseed
#
# Targets:
#   * Labor::Brand          >= 100
#   * Labor::Note           >= 60
#   * Labor::Perfumer       >= 30
#   * Spree::Product        >= 1000 (with ProductFragranceDetail + notes + perfumers)

namespace :labor do
  desc 'Seed ~100 brands, ~80 notes, ~40 perfumers and 1000 products (idempotent)'
  task megaseed: :environment do
    started = Time.now

    BRANDS = [
      %w[tom-ford TomFord USA 2006],
      %w[creed Creed UK 1760],
      %w[maison-margiela Maison-Margiela France 2010],
      %w[byredo Byredo Sweden 2006],
      %w[diptyque Diptyque France 1961],
      %w[jo-malone Jo-Malone UK 1990],
      %w[penhaligons Penhaligon-s UK 1870],
      %w[amouage Amouage Oman 1983],
      %w[frederic-malle Frederic-Malle France 2000],
      %w[serge-lutens Serge-Lutens France 1992],
      %w[atelier-cologne Atelier-Cologne France 2009],
      %w[memo-paris Memo-Paris France 2007],
      %w[nishane Nishane Turkey 2012],
      %w[xerjoff Xerjoff Italy 2003],
      %w[roja-parfums Roja-Parfums UK 2011],
      %w[clive-christian Clive-Christian UK 1999],
      %w[parfums-de-marly Parfums-de-Marly France 2009],
      %w[initio Initio France 2015],
      %w[mancera Mancera France 2008],
      %w[montale Montale France 2003],
      %w[kilian Kilian France 2007],
      %w[tiziana-terenzi Tiziana-Terenzi Italy 1990],
      %w[ormonde-jayne Ormonde-Jayne UK 2002],
      %w[bond-no-9 Bond-No-9 USA 2003],
      %w[etat-libre-dorange Etat-Libre-d-Orange France 2006],
      %w[mfk Maison-Francis-Kurkdjian France 2009],
      %w[ex-nihilo Ex-Nihilo France 2013],
      %w[acqua-di-parma Acqua-di-Parma Italy 1916],
      %w[houbigant Houbigant France 1775],
      %w[guerlain Guerlain France 1828],
      %w[ysl Yves-Saint-Laurent France 1961],
      %w[hermes Hermes France 1837],
      %w[armani Armani Italy 1975],
      %w[bvlgari Bvlgari Italy 1884],
      %w[cartier Cartier France 1847],
      %w[chopard Chopard Switzerland 1860],
      %w[lalique Lalique France 1888],
      %w[lanvin Lanvin France 1889],
      %w[lacoste Lacoste France 1933],
      %w[calvin-klein Calvin-Klein USA 1968],
      %w[hugo-boss Hugo-Boss Germany 1924],
      %w[burberry Burberry UK 1856],
      %w[davidoff Davidoff Switzerland 1980],
      %w[paco-rabanne Paco-Rabanne France 1966],
      %w[carolina-herrera Carolina-Herrera USA 1980],
      %w[issey-miyake Issey-Miyake Japan 1992],
      %w[kenzo Kenzo France 1970],
      %w[mugler Mugler France 1992],
      %w[jpg Jean-Paul-Gaultier France 1993],
      %w[azzaro Azzaro France 1962],
      %w[boucheron Boucheron France 1858],
      %w[ferragamo Salvatore-Ferragamo Italy 1927],
      %w[versace-niche Versace-Atelier Italy 1978],
      %w[dolce-gabbana Dolce-Gabbana Italy 1985],
      %w[moschino Moschino Italy 1983],
      %w[roberto-cavalli Roberto-Cavalli Italy 1970],
      %w[trussardi Trussardi Italy 1911],
      %w[bottega-veneta Bottega-Veneta Italy 1966],
      %w[maison-crivelli Maison-Crivelli France 2018],
      %w[shl777 Stephane-Humbert-Lucas-777 France 2012],
      %w[jusbox Jusbox Italy 2015],
      %w[histoires-de-parfums Histoires-de-Parfums France 2000],
      %w[lartisan-parfumeur L-Artisan-Parfumeur France 1976],
      %w[mdci MDCI France 2003],
      %w[eight-and-bob Eight-and-Bob Spain 1937],
      %w[profumum-roma Profumum-Roma Italy 1996],
      %w[floris-london Floris-London UK 1730],
      %w[czech-speake Czech-and-Speake UK 1981],
      %w[geo-f-trumper Geo-F-Trumper UK 1875],
      %w[truefitt-hill Truefitt-and-Hill UK 1805],
      %w[goutal Goutal France 1981],
      %w[ds-durga D-S-and-Durga USA 2007],
      %w[bohoboco Bohoboco Poland 2014],
      %w[imaginary-authors Imaginary-Authors USA 2012],
      %w[aether Aether France 2017],
      %w[bon-parfumeur Bon-Parfumeur France 2016],
      %w[comme-des-garcons Comme-des-Garcons Japan 1994],
      %w[aedes-de-venustas Aedes-de-Venustas USA 1995],
      %w[andy-tauer Tauer-Perfumes Switzerland 2005],
      %w[olfactive-studio Olfactive-Studio France 2011],
      %w[juliette-has-a-gun Juliette-Has-a-Gun France 2006],
      %w[zoologist Zoologist Canada 2013],
      %w[four-thousand-tuesdays 4160-Tuesdays UK 2010],
      %w[strangelove Strangelove-NYC USA 2014],
      %w[olibere Olibere-Parfums France 2014],
      %w[liis LIIS USA 2017],
      %w[regime-des-fleurs Regime-des-Fleurs USA 2012],
      %w[heeley Heeley France 2007],
      %w[acqua-dellelba Acqua-dell-Elba Italy 2002],
      %w[acca-kappa Acca-Kappa Italy 1869],
      %w[borntostandout Borntostandout Singapore 2017],
      %w[sora-dora Sora-Dora UK 2018],
      %w[lengling-munich Lengling-Munich Germany 2017],
      %w[lubin Lubin France 1798],
      %w[carner-barcelona Carner-Barcelona Spain 2010],
      %w[ramon-monegal Ramon-Monegal Spain 2010],
      %w[atkinsons Atkinsons UK 1799],
      %w[marc-antoine-barrois Marc-Antoine-Barrois France 2016],
      %w[berdoues Berdoues France 1902],
      %w[mona-di-orio Mona-di-Orio Netherlands 2004]
    ].freeze

    NOTES = [
      # citrus
      %w[bergamot Bergamot citrus],
      %w[lemon Lemon citrus],
      %w[orange Orange citrus],
      %w[grapefruit Grapefruit citrus],
      %w[neroli Neroli citrus],
      %w[bitter-orange Bitter-Orange citrus],
      %w[mandarin Mandarin citrus],
      %w[lime Lime citrus],
      %w[yuzu Yuzu citrus],
      %w[petitgrain Petitgrain citrus],
      # floral
      %w[jasmine Jasmine floral],
      %w[tuberose Tuberose floral],
      %w[ylang-ylang Ylang-Ylang floral],
      %w[iris Iris floral],
      %w[violet Violet floral],
      %w[lily Lily floral],
      %w[peony Peony floral],
      %w[magnolia Magnolia floral],
      %w[orchid Orchid floral],
      %w[osmanthus Osmanthus floral],
      %w[orange-blossom Orange-Blossom floral],
      %w[gardenia Gardenia floral],
      %w[honeysuckle Honeysuckle floral],
      %w[lily-of-the-valley Lily-of-the-Valley floral],
      %w[mimosa Mimosa floral],
      # woody
      %w[cedar Cedar woody],
      %w[oud Oud woody],
      %w[agarwood Agarwood woody],
      %w[gaiac Gaiac woody],
      %w[cypress Cypress woody],
      %w[pine Pine woody],
      %w[fir Fir woody],
      %w[juniper Juniper woody],
      %w[oakmoss Oakmoss woody],
      %w[birch Birch woody],
      %w[papyrus Papyrus woody],
      %w[cashmere-wood Cashmere-Wood woody],
      %w[sandal-mysore Mysore-Sandalwood woody],
      # oriental
      %w[amber Amber oriental],
      %w[vanilla Vanilla oriental],
      %w[civet Civet oriental],
      %w[ambergris Ambergris oriental],
      %w[benzoin Benzoin oriental],
      %w[labdanum Labdanum oriental],
      %w[frankincense Frankincense oriental],
      %w[myrrh Myrrh oriental],
      %w[tonka Tonka-Bean oriental],
      %w[opoponax Opoponax oriental],
      %w[styrax Styrax oriental],
      # aromatic / spices
      %w[cardamom Cardamom aromatic],
      %w[cinnamon Cinnamon aromatic],
      %w[clove Clove aromatic],
      %w[nutmeg Nutmeg aromatic],
      %w[pepper Pepper aromatic],
      %w[saffron Saffron aromatic],
      %w[ginger Ginger aromatic],
      %w[basil Basil aromatic],
      %w[sage Sage aromatic],
      %w[lavender Lavender aromatic],
      %w[geranium Geranium aromatic],
      %w[mint Mint aromatic],
      # gourmand
      %w[coffee Coffee gourmand],
      %w[chocolate Chocolate gourmand],
      %w[honey Honey gourmand],
      %w[almond Almond gourmand],
      %w[coconut Coconut gourmand],
      %w[caramel Caramel gourmand],
      %w[praline Praline gourmand],
      # fruit (green)
      %w[fig Fig green],
      %w[blackcurrant Blackcurrant green],
      %w[raspberry Raspberry green],
      %w[peach Peach green],
      %w[apple Apple green],
      %w[pear Pear green],
      %w[plum Plum green],
      %w[pineapple Pineapple green],
      %w[mango Mango green],
      %w[lychee Lychee green],
      %w[melon Melon green],
      %w[cucumber Cucumber green],
      %w[immortelle Immortelle green],
      %w[hay Hay green],
      # leather + smoky
      %w[leather Leather leather],
      %w[suede Suede leather],
      %w[smoke Smoke smoky],
      %w[incense Incense smoky],
      %w[tobacco Tobacco smoky],
      %w[ink Ink smoky],
      %w[paper Paper smoky],
      # aquatic
      %w[rain Rain aquatic],
      %w[ozone Ozone aquatic],
      %w[salt Sea-Salt aquatic],
      %w[seaweed Seaweed aquatic],
      # synthetics (chypre/woody)
      %w[aldehydes Aldehydes chypre],
      %w[iso-e-super Iso-E-Super woody],
      %w[ambroxan Ambroxan woody]
    ].freeze

    PERFUMERS = [
      'Ben Gorham',
      'Olivia Giacobetti',
      'Jean-Claude Ellena',
      'Francis Kurkdjian',
      'Christophe Laudamiel',
      'Mathilde Laurent',
      'Olivier Polge',
      'Jacques Polge',
      'Edouard Flechier',
      'Christine Nagel',
      'Bertrand Duchaufour',
      'Annick Menardo',
      'Calice Becker',
      'Dominique Ropion',
      'Maurice Roucel',
      'Daniela Andrier',
      'Alberto Morillas',
      'Carlos Benaim',
      'Jean-Claude Delville',
      'Pierre Bourdon',
      'Jean Kerleo',
      'Jacques Cavallier',
      'Olivier Cresp',
      'Sophie Labbe',
      'Antoine Lie',
      'Antoine Maisondieu',
      'Lyn Harris',
      'Andy Tauer',
      'Vero Kern',
      'Mark Buxton',
      'Geza Schoen',
      'Nathalie Lorson',
      'Honorine Blanc',
      'Anne Flipo',
      'Yann Vasnier',
      'Daphne Bugey',
      'Patricia de Nicolai',
      'Aurelien Guichard',
      'Cecile Zarokian',
      'Quentin Bisch'
    ].freeze

    NAME_TEMPLATES = [
      'Black Phantom',
      'Wild Echo',
      'Ombre Leather',
      'Velvet Orchid',
      'Lost Cherry',
      'Tuscan Leather',
      'Noir de Noir',
      'Soleil Blanc',
      'Bois d\'Argent',
      'Ambre Nuit',
      'Eau Sauvage',
      'Cuir de Russie',
      'Coromandel',
      'Misia',
      'Beige',
      'Gabrielle',
      'Allure',
      'Voyage d\'Hermes',
      'Terre',
      'Equipage',
      'Caleche',
      'Galop',
      'Eau des Merveilles',
      'Twilly',
      'Aventus',
      'Green Irish Tweed',
      'Royal Oud',
      'Silver Mountain Water',
      'Original Santal',
      'Imperial Millesime',
      'Bal d\'Afrique',
      'Gypsy Water',
      'Mojave Ghost',
      'Black Saffron',
      'Animalique',
      'Pulp',
      'Inflorescence',
      'Tam Dao',
      'Philosykos',
      'Do Son',
      'Eau Duelle',
      'Volutes',
      'Oud Palao',
      'Bois Imperial',
      'Layton',
      'Herod',
      'Pegasus',
      'Carlisle',
      'Side Effect',
      'Atomic Rose',
      'Megamare',
      'Ani',
      'Hacivat',
      'Fan Your Flames',
      'B-683',
      'Erba Pura',
      'Naxos',
      'Italica',
      'Casamorati',
      'Coro',
      'Lira',
      'Mefisto',
      'Cassiopea',
      'Andromeda',
      'Orion',
      'Vega',
      'Sirius',
      'Velvet Tobacco',
      'Crystal Aoud',
      'Aoud Lemon',
      'Black Aoud',
      'Intense Cafe',
      'Roses Vanille',
      'Cedrat Boise',
      'Dark Purple',
      'Encens Mythique',
      'Yatagan',
      'Habit Rouge',
      'L\'Heure Bleue',
      'Shalimar',
      'Mitsouko',
      'Vetiver',
      'Jicky',
      'Samsara',
      'Opium',
      'Black Opium',
      'Libre',
      'Y',
      'M7',
      'Kouros',
      'Le Male',
      'Fragile',
      'Classique',
      'Scandal',
      'Angel',
      'Alien',
      'Womanity',
      'Aura',
      'Light Blue',
      'The One',
      'K by Dolce',
      'Pour Homme',
      'Eros',
      'Dylan Blue',
      'Yellow Diamond',
      'Crystal Noir',
      'Bright Crystal',
      'Acqua',
      'Diamante Blu',
      'Pour Femme',
      'Just Cavalli',
      'Roberto',
      'Sky',
      'Acqua di Gio',
      'Code',
      'My Way',
      'Si',
      'Stronger With You',
      'Born in Roma',
      'Voce Viva',
      'Olympea',
      'Invictus',
      'Lady Million',
      '1 Million',
      'Phantom',
      'Fame',
      'Pure XS',
      'Black XS',
      'Ultraviolet',
      'Hypnotic Poison',
      'Pure Poison',
      'Dolce Vita',
      'J\'adore',
      'Miss Dior',
      'Sauvage',
      'Homme Intense',
      'Fahrenheit',
      'Eau Sauvage Extreme',
      'Joy',
      'La Vie est Belle',
      'Idole',
      'Tresor',
      'Magnifique',
      'Hypnose',
      'Poeme',
      'O de Lancome',
      'Climat',
      'Magie Noire',
      'Anais Anais',
      'Loulou',
      'Arpege',
      'Eclat d\'Arpege',
      'Rumeur',
      'Modern Princess',
      'Jeanne Lanvin',
      'Promesse',
      'Eternity',
      'Obsession',
      'Euphoria',
      'CK One',
      'CK Be',
      'Truth',
      'Reveal',
      'Defy',
      'Boss Bottled',
      'The Scent',
      'Hugo',
      'Boss Number One',
      'Touch',
      'Tommy',
      'Tommy Girl',
      'Impact',
      'Iconic',
      'Free',
      'Bold',
      'Brit',
      'London',
      'Mr Burberry',
      'Her',
      'Goddess',
      'Coup de Coeur',
      'My Burberry',
      'Touch of Spring',
      'Body',
      'Sport',
      'Weekend',
      'Summit',
      'Adventure',
      'Cool Water',
      'Champion',
      'Hot Water',
      'Run Wild',
      'Echo',
      'Silver Shadow',
      'Zino',
      'Relax',
      'Horizon',
      'Leather Blend',
      'Vetiver Blue'
    ].freeze

    DESCRIPTORS = %w[
      luminous opulent smoldering radiant velvety crystalline shadowy verdant
      ethereal nocturnal sun-drenched salt-kissed papered inked dusky candle-lit
      moss-laden cedar-forward leather-bound resinous balsamic powdery
    ].freeze

    BRAND_COUNTRY_FIX = {
      'TomFord'                 => 'Tom Ford',
      'Maison-Margiela'         => 'Maison Margiela',
      'Jo-Malone'               => 'Jo Malone',
      'Penhaligon-s'            => 'Penhaligon\'s',
      'Frederic-Malle'          => 'Frédéric Malle',
      'Serge-Lutens'            => 'Serge Lutens',
      'Atelier-Cologne'         => 'Atelier Cologne',
      'Memo-Paris'              => 'Memo Paris',
      'Roja-Parfums'            => 'Roja Parfums',
      'Clive-Christian'         => 'Clive Christian',
      'Parfums-de-Marly'        => 'Parfums de Marly',
      'Tiziana-Terenzi'         => 'Tiziana Terenzi',
      'Ormonde-Jayne'           => 'Ormonde Jayne',
      'Bond-No-9'               => 'Bond No. 9',
      'Etat-Libre-d-Orange'     => 'Etat Libre d\'Orange',
      'Maison-Francis-Kurkdjian' => 'Maison Francis Kurkdjian',
      'Ex-Nihilo'               => 'Ex Nihilo',
      'Acqua-di-Parma'          => 'Acqua di Parma',
      'Yves-Saint-Laurent'      => 'Yves Saint Laurent',
      'Hugo-Boss'               => 'Hugo Boss',
      'Calvin-Klein'            => 'Calvin Klein',
      'Paco-Rabanne'            => 'Paco Rabanne',
      'Carolina-Herrera'        => 'Carolina Herrera',
      'Issey-Miyake'            => 'Issey Miyake',
      'Jean-Paul-Gaultier'      => 'Jean Paul Gaultier',
      'Salvatore-Ferragamo'     => 'Salvatore Ferragamo',
      'Versace-Atelier'         => 'Versace Atelier',
      'Dolce-Gabbana'           => 'Dolce & Gabbana',
      'Roberto-Cavalli'         => 'Roberto Cavalli',
      'Bottega-Veneta'          => 'Bottega Veneta',
      'Maison-Crivelli'         => 'Maison Crivelli',
      'Stephane-Humbert-Lucas-777' => 'Stéphane Humbert Lucas 777',
      'Histoires-de-Parfums'    => 'Histoires de Parfums',
      'L-Artisan-Parfumeur'     => 'L\'Artisan Parfumeur',
      'Eight-and-Bob'           => 'Eight & Bob',
      'Profumum-Roma'           => 'Profumum Roma',
      'Floris-London'           => 'Floris London',
      'Czech-and-Speake'        => 'Czech & Speake',
      'Geo-F-Trumper'           => 'Geo F. Trumper',
      'Truefitt-and-Hill'       => 'Truefitt & Hill',
      'D-S-and-Durga'           => 'D.S. & Durga',
      'Imaginary-Authors'       => 'Imaginary Authors',
      'Bon-Parfumeur'           => 'Bon Parfumeur',
      'Comme-des-Garcons'       => 'Comme des Garçons',
      'Aedes-de-Venustas'       => 'Aedes de Venustas',
      'Tauer-Perfumes'          => 'Tauer Perfumes',
      'Olfactive-Studio'        => 'Olfactive Studio',
      'Juliette-Has-a-Gun'      => 'Juliette Has a Gun',
      '4160-Tuesdays'           => '4160 Tuesdays',
      'Strangelove-NYC'         => 'Strangelove NYC',
      'Olibere-Parfums'         => 'Olibere Parfums',
      'Regime-des-Fleurs'       => 'Régime des Fleurs',
      'Acqua-dell-Elba'         => 'Acqua dell\'Elba',
      'Acca-Kappa'              => 'Acca Kappa',
      'Sora-Dora'               => 'Sora Dora',
      'Lengling-Munich'         => 'Lengling Munich',
      'Carner-Barcelona'        => 'Carner Barcelona',
      'Ramon-Monegal'           => 'Ramón Monegal',
      'Marc-Antoine-Barrois'    => 'Marc-Antoine Barrois',
      'Mona-di-Orio'            => 'Mona di Orio',
      'Bohoboco'                => 'Bohoboco',
      'Aether'                  => 'Aether'
    }.freeze

    NOTE_NAME_FIX = {
      'Ylang-Ylang'            => 'Ylang-Ylang',
      'Bitter-Orange'          => 'Bitter Orange',
      'Orange-Blossom'         => 'Orange Blossom',
      'Lily-of-the-Valley'     => 'Lily of the Valley',
      'Mysore-Sandalwood'      => 'Mysore Sandalwood',
      'Cashmere-Wood'          => 'Cashmere Wood',
      'Tonka-Bean'             => 'Tonka Bean',
      'Sea-Salt'               => 'Sea Salt',
      'Iso-E-Super'            => 'Iso E Super'
    }.freeze

    rng = Random.new(20260521)

    store = Spree::Store.default
    shipping_category = Spree::ShippingCategory.find_or_create_by!(name: 'Default')
    tax_category = Spree::TaxCategory.find_or_create_by!(name: 'Default')

    puts "[megaseed] start  brands=#{Labor::Brand.count} notes=#{Labor::Note.count} perfumers=#{Labor::Perfumer.count} products=#{Spree::Product.count}"

    # ---------- BRANDS ----------
    BRANDS.each do |slug, raw_name, country, founded|
      pretty = BRAND_COUNTRY_FIX[raw_name] || raw_name
      Labor::Brand.find_or_create_by!(slug: slug) do |b|
        b.name = pretty
        b.country = country
        b.founded_year = founded.to_i
        b.niche = true
        b.active = true
      end
    end

    # ---------- NOTES ----------
    NOTES.each do |slug, raw_name, family|
      pretty = NOTE_NAME_FIX[raw_name] || raw_name
      Labor::Note.find_or_create_by!(slug: slug) do |n|
        n.name = pretty
        n.family = family
      end
    end

    # ---------- PERFUMERS ----------
    PERFUMERS.each do |full_name|
      slug = full_name.downcase.tr("'", '').gsub(/[^a-z0-9]+/, '-').gsub(/(^-|-$)/, '')
      Labor::Perfumer.find_or_create_by!(slug: slug) do |p|
        p.name = full_name
      end
    end

    puts "[megaseed] taxonomy ready  brands=#{Labor::Brand.count} notes=#{Labor::Note.count} perfumers=#{Labor::Perfumer.count}"

    # ---------- PRODUCTS ----------
    brand_ids    = Labor::Brand.pluck(:id, :slug)
    note_ids     = Labor::Note.pluck(:id)
    perfumer_ids = Labor::Perfumer.pluck(:id)

    target_total = 1000
    existing = Spree::Product.unscoped.count # include drafts/deleted-safety: only :all default scope counts non-deleted
    existing = Spree::Product.count
    needed = target_total - existing
    if needed <= 0
      puts "[megaseed] products already at #{existing}, nothing to add"
    else
      puts "[megaseed] creating #{needed} products to reach #{target_total}"
    end

    genders        = Labor::ProductFragranceDetail::GENDERS
    concentrations = Labor::ProductFragranceDetail::CONCENTRATIONS
    volumes        = [30, 50, 75, 100, 150]
    layers         = %w[top heart base]

    created = 0
    seq_start = existing # use seq to keep slugs unique across re-runs

    while created < needed
      ActiveRecord::Base.transaction do
        batch_size = [100, needed - created].min
        batch_size.times do
          seq = seq_start + created + 1
          brand_id, brand_slug = brand_ids[rng.rand(brand_ids.size)]
          base_name = NAME_TEMPLATES[rng.rand(NAME_TEMPLATES.size)]
          name = "#{base_name} #{seq}"
          slug = "#{brand_slug}-#{base_name.downcase.gsub(/[^a-z0-9]+/, '-').gsub(/(^-|-$)/, '')}-#{seq}"

          # If somehow this slug exists, skip (idempotency).
          if Spree::Product.unscoped.where(slug: slug).exists?
            created += 1
            next
          end

          d1 = DESCRIPTORS[rng.rand(DESCRIPTORS.size)]
          d2 = DESCRIPTORS[rng.rand(DESCRIPTORS.size)]
          description = "A #{d1}, #{d2} composition from #{BRAND_COUNTRY_FIX[brand_slug] || brand_slug.tr('-', ' ').capitalize}, layered for everyday wear."

          price = (rng.rand(35..450) * 10_000) # 350_000 .. 4_500_000 in 10k steps

          product = Spree::Product.new(
            name:                name,
            slug:                slug,
            description:         description,
            available_on:        1.year.ago,
            status:              'active',
            make_active_at:      1.year.ago,
            shipping_category:   shipping_category,
            tax_category:        tax_category,
            price:               price
          )
          product.stores << store
          product.save!

          # Set master variant price explicitly in UZS
          if product.master.default_price
            product.master.default_price.update_columns(amount: price, currency: 'UZS')
          else
            product.master.prices.create!(amount: price, currency: 'UZS')
          end

          Labor::ProductFragranceDetail.create!(
            spree_product_id: product.id,
            labor_brand_id:   brand_id,
            release_year:     rng.rand(1980..2025),
            gender:           genders[rng.rand(genders.size)],
            concentration:    concentrations[rng.rand(concentrations.size)],
            volume_ml:        volumes[rng.rand(volumes.size)],
            discontinued:     false,
            avg_rating:       (rng.rand * 1.3 + 3.6).round(2),
            avg_longevity:    (rng.rand * 5 + 3).round(2),
            avg_sillage:      (rng.rand * 5 + 3).round(2),
            votes_count:      rng.rand(5..900),
            reviews_count:    rng.rand(0..200),
            seasons_breakdown: {},
            time_breakdown:    {},
            love_breakdown:    {}
          )

          # 2-5 notes spread across layers
          n_total = rng.rand(2..5)
          picked = note_ids.sample(n_total, random: rng)
          picked.each_with_index do |nid, idx|
            layer = layers[idx % layers.size]
            Labor::ProductNote.create!(
              spree_product_id: product.id,
              labor_note_id:    nid,
              pyramid_layer:    layer,
              position:         idx
            )
          end

          # 1-2 perfumers
          rng.rand(1..2).times do
            pid = perfumer_ids[rng.rand(perfumer_ids.size)]
            Labor::ProductPerfumer.find_or_create_by!(
              spree_product_id:   product.id,
              labor_perfumer_id:  pid
            )
          end

          created += 1
        end
      end
      puts "[megaseed] #{created}/#{needed} products"
    end

    elapsed = (Time.now - started).round(1)
    puts "[megaseed] DONE in #{elapsed}s  brands=#{Labor::Brand.count} notes=#{Labor::Note.count} perfumers=#{Labor::Perfumer.count} products=#{Spree::Product.count} details=#{Labor::ProductFragranceDetail.count}"
  end
end
