# UZS is a no-minor-unit currency. The Money gem ships it as 2-decimal which
# would render `2,400,000.00 $`. Re-register here so Spree::Money emits clean
# integer "2 400 000 сум" (thin-space grouping, Cyrillic suffix).
#
# CLAUDE.md rule: "Currency: UZS, stored as integer minor units (UZS has no
# minor unit -> 100 sum = 100)". subunit_to_unit:1 enforces that.
#
# Money 6.x pinned by Spree 4.8 does not expose Money::Currency.update;
# use the unregister/register pair instead.
Money::Currency.unregister(:uzs) if Money::Currency.find(:uzs)
Money::Currency.register(
  priority: 100,
  iso_code: 'UZS',
  name: 'Uzbekistani Som',
  symbol: 'сум',
  alternate_symbols: [],
  subunit: 'Tiyin',
  subunit_to_unit: 1,
  symbol_first: false,
  html_entity: '',
  decimal_mark: ',',
  thousands_separator: ' ',
  iso_numeric: '860',
  smallest_denomination: 1
)

# Spree::Money does `::Money.default_currency ||= ...` which means the gem's
# bootup default (USD) sticks unless we pre-set this. Force UZS here.
Money.default_currency = Money::Currency.new(:uzs)

# Spree sets `Money.locale_backend = :i18n` which makes the formatter pull
# thousands_separator / decimal_mark from Rails I18n, ignoring our currency
# registration. Switch to :currency so the registered " " (thin space) and ","
# values above are honoured.
Money.locale_backend = :currency
