import type { enSuppliers } from "./en-suppliers";
import type { Translations } from "./types";

/**
 * Somali texts for suppliers (F03). Written without a native review: every block is marked and
 * must be checked by a Somali speaker before release.
 */
export const soSuppliers: Pick<Translations, keyof typeof enSuppliers> = {
  suppliers: {
    // TODO(translate-review)
    neighbour: "Dukaan deris ah",
    status: { waiting: "Sugaya", hidden: "La qariyay" },
    nav: {
      // TODO(translate-review)
      waiting_one: "{{count}} alaab-qeybiye ayaa dhammaystir sugaya",
      waiting_other: "{{count}} alaab-qeybiye ayaa dhammaystir sugaya",
    },
    units: {
      days_one: "{{count}} maalin",
      days_other: "{{count}} maalmood",
      weeks_one: "{{count}} toddobaad",
      weeks_other: "{{count}} toddobaad",
      months_one: "{{count}} bil",
      months_other: "{{count}} bilood",
    },
    unitName: { days: "Maalmo", weeks: "Toddobaadyo", months: "Bilo" },
    rule: {
      // TODO(translate-review)
      choice: {
        cash: "Lacag caddaan ah",
        within_time: "Bixi muddo gudaheed",
        pay_as_you_sell: "Bixi markaad iibiso",
        pay_after_all_sold: "Bixi marka dhammaan la iibiyo",
        after_sold_with_latest_date: "Bixi marka la iibiyo, taariikh ugu danbeeya leh",
      },
      // TODO(translate-review)
      short: {
        cash: "Lacag caddaan ah",
        within_time: "Bixi {{period}} gudaheed",
        pay_as_you_sell: "Bixi markaad iibiso",
        pay_after_all_sold: "Bixi marka dhammaan la iibiyo",
        after_sold_with_latest_date: "Bixi markaad iibiso, ugu danbayn {{period}}",
      },
      // TODO(translate-review)
      sentence: {
        cash: "Waxaad bixisaa lacagta marka alaabta timaado.",
        within_time: "Waxaad bixisaa lacagta {{period}} gudaheed alaab kasta ka dib.",
        pay_as_you_sell:
          "Waxaad bixisaa alaab kasta marka aad iibiso, sidaas darteed waxaad bixisaa oo kaliya wixii la iibiyay.",
        pay_after_all_sold: "Waxaad bixisaa marka alaabta oo dhan la iibiyo.",
        after_sold_with_latest_date:
          "Waxaad bixisaa marka aad iibiso, laakiin ka dib {{period}} ma noqonayso, mid ka horeeya.",
      },
    },
    // TODO(translate-review)
    list: {
      title: "Alaab-qeybiyeyaal",
      search: "Raadi alaab-qeybiye",
      add: "Ku dar alaab-qeybiye",
      addFirst: "Ku dar alaab-qeybiyahaaga ugu horreeya",
      empty: "Weli alaab-qeybiye ma jiro.",
      noMatch: "Alaab-qeybiye lama helin.",
      loadMore: "Soo bandhig kuwo kale",
      showHidden: "Tus alaab-qeybiyeyaasha la qariyay",
      waitingLink_one: "{{count}} alaab-qeybiye ayaa u baahan lambar taleefan. Dhammaystir.",
      waitingLink_other: "{{count}} alaab-qeybiye ayaa u baahan lambar taleefan. Dhammaystir.",
    },
    add: { title: "Ku dar alaab-qeybiye" },
    edit: { title: "Beddel {{name}}" },
    // TODO(translate-review)
    form: {
      name: "Magaca alaab-qeybiyaha",
      phone: "Lambarka taleefanka",
      phoneHint: "Lambarrada Dubai iyo Shiinaha waxay ku bilaabmaan +, sida +971 50 123 4567.",
      invalidPhone: "Geli lambar Kenya ah sida 0712 345 678, ama lambar ku bilaabma +.",
      rule: "Sidee u bixisaa alaab-qeybiyahan?",
      periodNumber: "Imisa",
      periodUnit: "Maalmo, toddobaadyo ama bilo",
      invalidPeriod: "Geli tiro dhan, sida 2.",
      currency: "Lacagta",
      neighbour: "Dukaan deris ah",
      neighbourHint: "Dukaan u dhow oo alaab ka qaadato.",
      kraPin: "KRA PIN (ikhtiyaar)",
      kraPinHint: "Hal xaraf, 9 lambar iyo hal xaraf, sida A123456789B.",
      market: "Suuq ama goob (ikhtiyaar)",
      marketHint: "Tusaale: Eastleigh, Dubai",
      notes: "Xusuus (ikhtiyaar)",
    },
    // TODO(translate-review)
    block: {
      phoneTitle: "Alaab-qeybiye kale ayaa horay u lahaa lambarkan taleefan.",
      similarTitle: "Alaab-qeybiye magac la mid ah ayaa jira. Isagii miyaa?",
      openExisting: "Fur alaab-qeybiyahan",
      createAnyway: "Ma isku mid aha, abuur",
      changeName: "Beddel magaca",
    },
    // TODO(translate-review)
    detail: {
      noPhone: "Weli lambar taleefan ma jirto",
      ruleNote: "Beddelka qaanuunka lacag-bixinta wuxuu khuseeyaa alaabta cusub oo kaliya.",
      added: "La daray",
      waitingBanner:
        "Alaab-qeybiyahan waxaa lagu daray magac oo kaliya. Lambarka taleefanka iyo faahfaahinta kale weli waa maqan yihiin.",
      completeLink: "Dhammaystir",
      hide: "Qari alaab-qeybiyaha",
      unhide: "Mar kale tus alaab-qeybiyaha",
      hideConfirm: "Qari {{name}}? Waad dib u tusi kartaa.",
    },
    // TODO(translate-review)
    quick: {
      open: "Ku dar alaab-qeybiye magac",
      title: "Ku dar alaab-qeybiye magac",
      hint: "Hadda magaca keliya ayaa loo baahan yahay. Mulkiilaha ama maareeyaha ayaa dhamaystiri doona.",
      submit: "Ku dar alaab-qeybiye",
      added: "{{name}} waa lagu daray.",
    },
    // TODO(translate-review)
    waiting: {
      title: "Alaab-qeybiyeyaal la dhammaystiro",
      intro:
        "Alaab-qeybiyeyaashan waxaa lagu daray magac oo kaliya. Ku dar lambarka taleefanka si aad u dhammaystirto.",
      addedBy: "Waxaa daray {{name}}, {{when}}",
      complete: "Ku dar taleefan oo dhammaystir",
      save: "Dhammaystir alaab-qeybiyaha",
      saveAnyway: "Ma isku mid aha, dhammaystir",
    },
  },
};
