import type { enReceiving, enReceivingErrors } from "./en-receiving";
import type { Translations } from "./types";

/**
 * Somali texts for stock in, deliveries and the Stock screen (F04a).
 * TODO(translate-review): this whole file is a first draft written without a native speaker.
 * It must be checked by a Somali speaker before release.
 */
export const soReceiving: Pick<Translations, keyof typeof enReceiving> = {
  receiving: {
    title: "Alaab soo gal",
    location: "Halkee loo geynayaa?",
    money: "KES {{amount}}",
    save: "Keydi keenista",
    supplier: {
      label: "Alaab-qeybiye",
      change: "Beddel alaab-qeybiyaha",
      search: "Qor qayb ka mid ah magaca alaab-qeybiyaha",
      none: "Alaab-qeybiye lama helin. Ku dar magaca hoos.",
      addFull: "Ku dar alaab-qeybiye cusub",
    },
    add: {
      label: "Ku dar alaab",
      hint: "Iska scan garee barcode-ka oo taabo Enter, ama qor qayb ka mid ah magaca.",
      added: "{{name}} waa lagu daray.",
      imeiFirst:
        "Kani waa IMEI. Marka hore ku dar taleefanka magaciisa ama barcode-kiisa, kadibna geli IMEI-yadiisa safkiisa.",
      notFound: "Alaab leh barcode-ka {{code}} lama helin.",
      addProduct: "Ku dar alaabtan (waxay ka furmaysaa tab cusub)",
    },
    sheet: {
      title: "Waxa yimid",
      empty: "Weli alaab lama darin. Scan ama qor kor si aad kuwa ugu horreeya ugu darto.",
    },
    row: {
      product: "Alaab",
      quantity: "Tirada",
      unit: "Cutub",
      cost: "Qiimaha",
      packOption: "{{name}} ({{size}} xabbadood)",
      imeis: "IMEI {{count}}/{{pieces}}",
      serials: "Lambarrada taxanaha {{count}}/{{pieces}}",
      remove: "Ka saar {{name}}",
    },
    cost: {
      modeLabel: "Qiimaha waa",
      modeTotal: "Wadarta safka",
      modeEach: "Qiimaha mid kasta",
      amountLabel: "Lacagta",
      lineTotal: "Wadarta safka {{amount}}",
      each: "Qiimaha mid kasta {{amount}}",
      perPiece: "{{amount}} xabbad kasta",
      pending: "Banaan ka dhig haddii qiimaha weli la aqoon.",
      toBeAdded: "Qiimaha waa la dari doonaa",
    },
    unit: {
      count: "{{count}} ka mid ah {{pieces}} lambar ayaa la geliyay",
      scanImei: "Scan garee ama qor IMEI, kadibna taabo Enter",
      scanSerial: "Scan garee ama qor lambarka taxanaha, kadibna taabo Enter",
      paste: "Ama ku dheji liis, mid saf kasta",
      pasteHintImei: "IMEI labaad ayaa isla safka ku xiga ka dib tab ama hal koma.",
      pasteHintSerial: "Hal lambar taxane saf kasta.",
      soldNote:
        "IMEI-gan hore ayaa loo iibiyay. Mulkiilaha ama maareeyaha ayaa xaqiijin doona marka aad keydiso.",
      inStockAt: "{{imei}} horey ayuu kaydka ugu jiraa {{place}}.",
      problem: {
        invalid:
          "IMEI sax ma aha. Wuxuu u baahan yahay 15 lambar oo leh lambarka hubinta saxda ah.",
        fourteen: "Kaliya 14 lambar. Mar kale hubi lambarka.",
        duplicate: "Labo jeer ayaa lagu soo geliyay keenistan.",
        invalid2: "IMEI-ga labaad sax ma aha.",
        serial_long: "Lambarka taxanaha aad buu u dheer yahay.",
      },
    },
    unitStatus: {
      in_stock: "Kaydka ku jira",
      sold: "La iibiyay",
      reserved: "La dhigay",
      damaged: "Waa jabay",
      lost: "Waa lumay",
    },
    totals: {
      label: "Wadarta",
      items_one: "{{count}} shay",
      items_other: "{{count}} shay",
      pieces_one: "{{count}} xabbad",
      pieces_other: "{{count}} xabbadood",
      cost: "Wadarta qiimaha: KES {{amount}}",
      pending_one: "+ {{count}} saf oo qiimihiisa la dari doono",
      pending_other: "+ {{count}} saf oo qiimahooda la dari doono",
    },
    incomplete: {
      label: "Keydi isagoo aan dhammays tirnayn",
      hint: "Qaar ka mid ah IMEI ama lambarrada taxanaha way maqan yihiin. Alaabtaas lama iibin karo ilaa aad lambarrada ku darto.",
    },
    pay: {
      title: "Lacag bixin",
      how: "Sidee ayaad u bixinaysaa?",
      credit: "Dayn",
      part: "Qayb la bixiyay",
      full: "Dhammaan la bixiyay",
      from: "Ka bixi",
      choosePlace: "Dooro meesha",
      amount: "Lacagta",
      addPlace: "Ka bixi meel kale",
      removePlace: "Ka saar lacag bixintan",
      pendingNote_one:
        "{{count}} saf weli qiime ma laha. Hadda waxaa la bixin karaa oo keliya qiimaha la yaqaan.",
      pendingNote_other:
        "{{count}} saf weli qiime ma laha. Hadda waxaa la bixin karaa oo keliya qiimaha la yaqaan.",
      owedRule:
        "Qiimaha la yaqaan: KES {{amount}}. Waxa aanad hadda bixin waxaa lagugu leeyahay alaab-qeybiyaha.",
      ruleOnly: "Xeer lacag bixin oo kale, keenistan keliya",
      ruleHint:
        "Kani wuxuu beddelayaa xeerka keenistan keliya. Xeerka alaab-qeybiyaha isagu isma beddelayo.",
    },
    invoice: {
      more: "Lambarka rasiidka iyo qoraal",
      number: "Lambarka rasiidka alaab-qeybiyaha",
      note: "Qoraal",
    },
    issue: {
      title: "Fadlan marka hore saxo kuwan:",
      supplier: "Dooro alaab-qeybiyaha.",
      usdSupplier:
        "Alaab-qeybiyahan waxaa lagu bixiyaa doolar Mareykan. Keenista doolarka weli ma diyaar aha.",
      location: "Dooro goobta.",
      noRows: "Ku dar ugu yaraan hal alaab.",
      quantity: "Geli tiro dhan oo ah 1 ama ka badan.",
      cost: "Geli lacag ka badan 0, sida 1,200 ama 1,200.50, ama banaan ka dhig haddii qiimaha la aqoon.",
      numbers:
        "Qaar ka mid ah IMEI ama lambarrada taxanaha waa khaldan yihiin. Casaan ayaa lagu muujiyay.",
      tooManyNumbers: "Alaab waxay leedahay lambarro ka badan xabbadaha.",
      incomplete:
        "Qaar ka mid ah IMEI ama lambarrada taxanaha way maqan yihiin. Ku dar, ama shid Keydi isagoo aan dhammays tirnayn.",
      rulePeriod: "Geli lambar dhan oo ah xeerka lacag bixinta, sida 2.",
      fullWithPending:
        "Saf aan qiime lahayn dhammaantiis lama bixin karo. Dooro Qayb la bixiyay ama Dayn.",
      nothingToPay: "Weli qiime la yaqaan oo la bixiyo ma jiro.",
      chooseMoneyPlace: "Dooro meesha lacagta ee lacag bixin kasta.",
      paymentAmount: "Geli lacagta lacag bixin kasta.",
      samePlaceTwice: "Meel lacageed kasta hal mar isticmaal.",
      paymentTooMuch: "Lacagta la bixinayo way ka badan tahay qiimaha.",
      fullMustMatch: "Dhammaan la bixiyay waa inuu la mid noqdaa wadarta qiimaha.",
      partIsFull: "Taasi wax kasta way bixinaysaa. Dooro Dhammaan la bixiyay.",
    },
    error: {
      inStockAt: "{{imei}} horey ayuu kaydka ugu jiraa {{place}}.",
      soldBeforeNumber:
        "{{imei}} hore ayaa loo iibiyay. Haddii uu yahay taleefan soo laabtay, mulkiilaha ama maareeyaha ayaa xaqiijin kara oo halkan ku qaadan kara.",
      confirmSoldBefore: "Xaqiiji oo keydi",
      askOwner: "Weydii mulkiilaha ama maareeyaha inuu tan xaqiijiyo.",
    },
    list: {
      title: "Keenisyada",
      new: "Alaab soo gal",
      empty: "Weli keenis ma jirto.",
      owed: "Deyn KES {{amount}}",
      pendingCosts: "Qiimaha waa la dari doonaa",
      incomplete: "IMEI way maqan yihiin",
      loadMore: "Muuji wax dheeraad ah",
    },
    delivery: {
      title: "Keenis {{number}}",
      back: "Dhammaan keenisyada",
      saved: "Keenista waa la keydiyay.",
      supplier: "Alaab-qeybiye",
      location: "Goobta",
      received: "La helay",
      by: "Waxaa helay",
      invoice: "Lambarka rasiidka",
      note: "Qoraal",
      total: "Qiimaha la yaqaan",
      paid: "La bixiyay",
      owed: "Weli lagu leeyahay",
      rule: "Xeerka lacag bixinta",
      due: "Taariikhda la bixinayo",
      pendingLines_one: "{{count}} saf ayaa qiimihiisa sugaya.",
      pendingLines_other: "{{count}} saf ayaa qiimahooda sugaya.",
      incompleteUnits_one: "{{count}} IMEI ama lambar taxane ayaa weli maqan.",
      incompleteUnits_other: "{{count}} IMEI ama lambar taxane ayaa weli maqan.",
      paidFrom: "La bixiyay KES {{amount}} oo laga bixiyay {{place}}",
      drawerNegative: "Lacag bixintan waxay {{place}} ka dhigtay wax ka hooseeya eber.",
      arrived: "Waxa yimid",
      packQuantity: "{{quantity}} {{name}} ({{pieces}} xabbadood)",
      pieces_one: "{{count}} xabbad",
      pieces_other: "{{count}} xabbadood",
      missingUnits_one: "{{count}} lambar ayaa maqan",
      missingUnits_other: "{{count}} lambar ayaa maqan",
    },
    complete: {
      title: "Ku dar IMEI-yada maqan",
      hint: "Scan garee ama ku dheji lambarrada maqan. Alaabtaas waa la iibin karaa marka la keydiyo.",
      nothing: "Geli ugu yaraan hal lambar.",
      fix: "Marka hore saxo lambarrada casaanka ah.",
      save: "Keydi lambarrada",
    },
    costs: {
      title: "Ku dar qiimayaasha maqan",
      hint: "Qor waxa alaab-qeybiyuhu ka qaaday safka oo dhan. Saf banaan ka dhig si aad ugu darto marka dambe.",
      lineTotal: "Wadarta safka {{name}}",
      nothing: "Geli ugu yaraan hal qiime.",
      save: "Keydi qiimayaasha",
    },
  },
  stock: {
    title: "Kayd",
    search: "Raadi alaab",
    location: "Goobta",
    allLocations: "Goobaha oo dhan",
    empty: "Weli kayd ma jiro. Wuxuu soo muuqdaa marka aad keenis qaadato.",
    noMatch: "Waxba ma jiraan.",
    loadMore: "Muuji wax dheeraad ah",
    onHand_one: "{{count}} kaydka ku jira",
    onHand_other: "{{count}} kaydka ku jira",
    value: "Qiimihiisu waa KES {{amount}}",
    incomplete_one: "{{count}} ayaa sugaya IMEI ama lambar taxane",
    incomplete_other: "{{count}} ayaa sugaya IMEI ama lambar taxane",
    costMissing_one: "{{count}} aan qiime lahayn",
    costMissing_other: "{{count}} aan qiime lahayn",
    lookup: {
      label: "Ku raadi taleefan IMEI ama lambar taxane",
      hint: "Qor ama scan garee lambarka.",
      find: "Raadi",
      none: "Waxba lagama helin {{number}}.",
      results: "Natiijooyin",
      received: "Keenis {{number}}, {{when}}",
      cost: "qiimaha KES {{amount}}",
    },
  },
};

export const soReceivingErrors: Record<keyof typeof enReceivingErrors, string> = {
  delivery_not_found: "Keenistan lama helin.",
  command_conflict:
    "Keenistan hore ayaa loo keydiyay faahfaahin kale. Hubi liiska keenisyada kahor intaadan mar kale isku dayin.",
  product_not_receivable:
    "Alaab ku jirta xaashida waa qarsoon tahay ama ma diyaar aha. Ka saar oo isku day mar kale.",
  invalid_pack_unit: "Cutubka alaabta loo doortay sax ma aha. Mar kale dooro.",
  invalid_imei: "IMEI sax ma aha. Wuxuu u baahan yahay 15 lambar oo leh lambarka hubinta saxda ah.",
  duplicate_imei_in_delivery: "IMEI isku mid ah ayaa laba jeer ku jira keenistan.",
  imei_in_stock: "IMEI-gan horey ayuu kaydka ugu jiray.",
  imei_sold_before:
    "IMEI-gan hore ayaa loo iibiyay. Mulkiilaha ama maareeyaha ayaa xaqiijin doona.",
  imei_count_mismatch:
    "Tirada IMEI-yada kuma sii socoto tirada. Ku dar kuwa maqan, ama keydi isagoo aan dhammays tirnayn.",
  units_not_allowed: "Alaabtan ma qaadato IMEI ama lambarrada taxanaha.",
  payment_exceeds_total: "Lacagta la bixinayo way ka badan tahay qiimaha keenista.",
  insufficient_funds: "Meeshaas lacag ku filan kuma jirto si tan loogu bixiyo.",
  cost_already_known: "Qiimaha safkan hore ayaa loo geliyay.",
  line_not_found: "Safkan lagama helin keenista.",
};
