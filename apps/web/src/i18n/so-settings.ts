import type { enSettings } from "./en-settings";
import type { Translations } from "./types";

/**
 * Somali text for the app shell and Settings. Same keys as `en-settings.ts`.
 * TODO(translate-review): this whole file is a first draft and needs a native speaker's check.
 */
export const soSettings: Pick<Translations, keyof typeof enSettings> = {
  shell: {
    location: "Goobta",
  },
  nav: {
    label: "Liiska weyn",
    home: "Bogga hore",
    products: "Alaabta",
    suppliers: "Alaab-qeybiyeyaal",
    settings: "Dejinta",
  },
  setup: {
    title: "Halkee wax ka iibisaa?",
    intro: "Dukaankaaga magac sii. Dukaamo iyo bakhaarro kale waxaad ku dari kartaa Dejinta.",
    name: "Magaca dukaanka",
    nameHint: "Tusaale: Luthuli Shop 1",
    submit: "Dhammaad",
    waitTitle: "Weli goob ma jirto",
    waitBody:
      "Weli laguma darin dukaan ama bakhaar. Weydii milkiilaha inuu goob kuu daro, kadibna mar kale gal.",
  },
  settings: {
    title: "Dejinta",
    business: { title: "Xogta ganacsiga", hint: "Magac, cinwaan, taleefan, KRA PIN, VAT" },
    locations: { title: "Goobaha", hint: "Dukaamadaada iyo bakhaarradaada" },
    moneyPlaces: { title: "Meelaha lacagta", hint: "M-Pesa, bangi, sanduuq iyo khasnadaha" },
    staff: { title: "Shaqaalaha", hint: "Dadka kula shaqeeya" },
    // TODO(translate-review)
    categories: {
      title: "Qaybaha alaabta",
      hint: "Telefoonno, chargers iyo qaybaha kale ee alaabta",
    },
  },
  businessDetails: {
    intro:
      "Xogtan waxay ka muuqataa rasiidhada iyo dukumentiyada kale. Magaca keliya ayaa loo baahan yahay.",
    name: "Magaca ganacsiga",
    address: "Cinwaanka ama suuqa",
    addressHint: "Tusaale: Luthuli Avenue, Shop 12",
    phone: "Lambarka taleefanka",
    email: "Iimayl",
    kraPin: "KRA PIN (ikhtiyaari)",
    kraPinHint: "Hal xaraf, 9 lambar, hal xaraf. Tusaale: A123456789B",
    footerNote: "Qoraal ku yaal hoosta rasiidhka",
    footerNoteHint: "Tusaale: Mahadsanid inaad nala soo iibsatay",
    vat: "Qaado VAT",
    vatHint: "Dami tan haddii ganacsigaagu aanu VAT kaga diiwaan gashanayn KRA.",
  },
  locations: {
    add: "Ku dar goob",
    addTitle: "Goob cusub",
    name: "Magaca",
    type: "Nooca",
    types: { shop: "Dukaan", store: "Bakhaar" },
    canSell: "Halkan wax laga iibiyaa",
    canSellHint:
      "Dukaamadu wax way iibiyaan. Bakhaarradu alaab keliya ayay hayaan, ilaa aad tan shido.",
    priceList: "Liiska qiimaha",
    priceLists: { retail: "Qiimaha tafaariiqda", wholesale: "Qiimaha jumladda" },
    sells: "Wax waa laga iibiyaa",
    noSelling: "Wax lagama iibiyo",
    close: "Xir",
    reopen: "Mar kale fur",
    closeConfirm: "Ma xiraysaa {{name}}? Waa la qarin doonaa. Taariikhdeedu way sii jiraysaa.",
    lastLocation: "Tani waa goobtaada keliya ee furan. Ku dar goob kale ka hor intaadan tan xirin.",
    notEmpty: {
      title: "Goobtan weli lama xiri karo:",
      stock: "Weli alaab ayay haysaa. Marka hore alaabta u wareeji goob kale.",
      stockCount: "Weli alaab ayay haysaa (tirada: {{count}}). Marka hore u wareeji goob kale.",
      cash: "Khasnadeedu ma madhna. Marka hore lacagta u wareeji.",
      cashAmount: "Khasnadeeda waxaa ku jira KES {{amount}}. Marka hore lacagta u wareeji.",
      generic: "Weli alaab ama lacag ayay haysaa. Marka hore u wareeji.",
    },
    openList: "Goobaha furan",
    closedList: "Goobaha xiran",
    showClosed: "Muuji kuwa xiran ({{count}})",
    hideClosed: "Qari kuwa xiran",
  },
  moneyPlaces: {
    intro:
      "Halka lacagtaadu taal. Goob kasta oo wax iibisa waxay si toos ah u helaysaa khasnad u gaar ah.",
    add: "Ku dar meel lacag",
    addTitle: "Meel lacag oo cusub",
    type: "Nooca",
    types: {
      cash_drawer: "Khasnad",
      mpesa_till: "M-Pesa Till (Buy Goods)",
      mpesa_paybill: "M-Pesa Paybill",
      bank: "Akoon bangi",
      safe: "Sanduuq",
    },
    name: "Magaca",
    nameHint: "Tusaale: Till-ka Dukaanka 1",
    number: {
      mpesa_till: "Lambarka Till-ka",
      mpesa_paybill: "Lambarka Paybill-ka",
      bank: "Lambarka akoonka",
    },
    settlesTo: "Lacagta Paybill-kan waxay aadaa",
    settlesToHint: "Dooro akoonka bangiga haddii Paybill-kan uu ku shubo.",
    settlesToNone: "Kuma xirna bangi",
    settlesToShort: "wuxuu aadaa {{name}}",
    locations: "Goobahee lagu isticmaalaa?",
    hide: "Qari",
    unhide: "Mar kale muuji",
    showHidden: "Muuji kuwa qarsoon ({{count}})",
    hideHidden: "Qari kuwa qarsoon",
  },
  staff: {
    add: "Ku dar shaqaale",
    addTitle: "Ku dar shaqaale",
    addAnother: "Ku dar qof kale",
    name: "Magaca",
    phone: "Lambarka taleefanka",
    email: "Iimayl",
    contactHint: "Geli lambar taleefan, iimayl, ama labadaba. Waxay ku galayaan.",
    role: "Doorka",
    roleHint: {
      owner: "Wax walba wuu samayn karaa, goob kasta.",
      manager: "Wuxuu maamulaa goobihiisa: alaab, qiimo, iib iyo warbixin.",
      cashier: "Wax buu iibiyaa oo lacag buu qaataa goobihiisa.",
      storekeeper: "Alaab buu qaataa, wareejiyaa oo tiriyaa.",
      accountant: "Wuu arki karaa oo soo dejin karaa. Waxba ma beddeli karo.",
    },
    locations: "Wuxuu ka shaqeeyaa",
    ownerAllLocations: "Milkiilayaashu goob kasta way ka shaqeeyaan.",
    allLocations: "Goobaha oo dhan",
    lastLogin: "Galitaankii u dambeeyay: {{when}}",
    neverLoggedIn: "Weli ma uusan galin",
    status: { active: "Firfircoon", switched_off: "La damiyay" },
    tempPassword: {
      title: "Furaha sirta ah ee ku meel gaarka ah ee {{name}}",
      explain:
        "Furahan qofka sii. Wuxuu ku galayaa taleefankiisa ama iimaylkiisa iyo furahan, kadibna waa inuu doortaa furihiisa.",
      // TODO(translate-review)
      expires: "Furahan sirta ah ee ku meel gaarka ah wuxuu shaqeeyaa 72 saacadood.",
      once: "Furahan hadda keliya ayaa la muujinayaa. Qor ama koobiyee ka hor intaadan bogga ka bixin.",
      copy: "Koobiyee furaha",
      copied: "Furaha waa la koobiyeeyay",
      copyFailed: "Lama koobiyeyn karo. Fadlan furaha qor.",
    },
    selfNote: "Kani waa adiga. Ma beddeli kartid doorkaaga, mana damin kartid naftaada.",
    roleSection: "Doorka iyo goobaha",
    accessSection: "Galitaanka",
    switches: {
      more: "Wax kale: waxa qofkani samayn karo",
      intro: "Doorka ayaa bixiya dejinta bilowga. Qofkan keliya u beddel haddii loo baahdo.",
      roleDefault: "La mid ah doorka",
      changed: "Qofkan loo beddelay",
      save: "Kaydi isbeddellada",
    },
    reset: {
      button: "Dib u deji furaha",
      confirm:
        "Ma u samaynaysaa {{name}} fure cusub oo ku meel gaar ah? Furihii hore wuu joogsanayaa.",
    },
    switchOff: {
      button: "Dami",
      confirm:
        "Ma damisaa {{name}}? Hadda waa laga saarayaa mana geli karo. Shaqadiisii hore way sii jiraysaa.",
    },
    switchOn: {
      button: "Shid",
      confirm: "Ma dib u shiddaa {{name}}? Mar kale wuu geli karaa.",
    },
    history: {
      title: "Taariikhda galitaanka",
      show: "Muuji taariikhda galitaanka",
      empty: "Weli galitaan ma jiro.",
      outcome: { success: "Wuu galay", failure: "Fure khaldan", locked: "La xiray" },
    },
  },
  permission: {
    manage_business: "Beddel xogta ganacsiga iyo VAT",
    manage_locations: "Ku dar oo beddel goobaha iyo meelaha lacagta",
    add_staff: "Ku dar khasnajiyayaal iyo bakhaar-hayeyaal",
    approve_items: "Oggolow alaab iyo alaab-qeybiyeyaal cusub",
    add_products: "Ku dar alaab",
    // TODO(translate-review)
    manage_products: "Beddel, qari oo habee alaabta iyo qaybaha",
    // TODO(translate-review)
    manage_suppliers: "Ku dar oo beddel alaab-qeybiyeyaal iyo sida aad ugu bixiso",
    set_prices: "Beddel qiimaha",
    see_cost_profit: "Arag kharashka iyo faa'iidada",
    sell: "Iibi oo lacag qaado",
    give_discounts: "Sii qiimo dhimis",
    do_refunds: "Lacag celi",
    receive_stock: "Qaado alaab",
    record_expenses: "Qor kharashaadka",
    close_day: "Xir maalinta",
    view_reports: "Arag warbixinnada",
  },
};
