import type { Translations } from "./types";

/**
 * Somali UI text. Same keys as `en.ts` (enforced by the `Translations` type and a test).
 * Lines marked TODO(translate-review) should be checked by a native speaker before release.
 */
export const so: Translations = {
  app: {
    name: "Books",
    loading: "Waa la soo rarayaa…",
  },
  language: {
    label: "Luqadda",
    en: "English",
    so: "Soomaali",
  },
  common: {
    continue: "Sii wad",
    back: "Dib u noqo",
    logout: "Ka bax",
    show: "Muuji",
    hide: "Qari",
    showPassword: "Muuji furaha sirta ah",
    hidePassword: "Qari furaha sirta ah",
    working: "Fadlan sug…",
    retry: "Isku day mar kale",
  },
  login: {
    title: "Gal",
    identifier: "Lambarka taleefanka ama iimaylka",
    identifierHint: "Tusaale: 0712 345 678",
    password: "Furaha sirta ah",
    submit: "Gal",
    noAccount: "Ganacsi cusub?",
    registerLink: "Samee akoon",
    forgot: "Ma ilowday furaha sirta ah?",
    recoveredNotice: "Furahaaga sirta ah waa la beddelay. Ku gal furaha cusub.",
  },
  register: {
    title: "Samee ganacsigaaga",
    businessName: "Magaca ganacsiga",
    ownerName: "Magacaaga",
    phone: "Lambarka taleefanka",
    email: "Iimayl",
    // TODO(translate-review)
    contactHint: "Geli lambar taleefan, iimayl, ama labadaba. Waxaad ku geli doontaa app-ka.",
    password: "Furaha sirta ah",
    submit: "Samee akoon",
    haveAccount: "Akoon ma leedahay?",
    loginLink: "Gal",
  },
  password: {
    checklistTitle: "Furahaaga sirta ah wuxuu u baahan yahay:",
    rule_length: "Ugu yaraan 10 xaraf",
    // TODO(translate-review)
    rule_mix: "3 ka mid ah: xarfo yaryar, XARFO WAAWEYN, lambarro, calaamado (sida ! ama #)",
    // TODO(translate-review)
    rule_common: "Ha noqon mid fudud, hana noqon magacaaga ama magaca ganacsiga",
    rule_max: "Kama badna 128 xaraf",
    met: "Waa dhammaad",
    notMet: "Weli maya",
  },
  passwordProblem: {
    too_short: "Furaha sirta ah waa gaaban yahay. Isticmaal ugu yaraan 10 xaraf.",
    too_long: "Furaha sirta ah waa dheer yahay. Isticmaal 128 xaraf ama ka yar.",
    // TODO(translate-review)
    too_simple:
      "Isku dar 3 nooc: xarfo yaryar, XARFO WAAWEYN, lambarro iyo calaamado (sida ! ama #).",
    // TODO(translate-review)
    too_common:
      "Furahan sirta ah si fudud ayaa loo qiyaasi karaa. Ha isticmaalin magacaaga ama fure caadi ah.",
  },
  recovery: {
    // TODO(translate-review)
    title: "Kaydi koodhadhka soo celinta",
    // TODO(translate-review)
    intro:
      "Haddii aad ilowdo furaha sirta ah, mid ka mid ah koodhadhkan ayaa kugu soo celinaya. Kood kasta hal mar ayuu shaqeeyaa. Hadda oo keliya ayaan ku tusaynaa.",
    copy: "Koobi koodhadhka",
    copied: "Koodhadhka waa la koobiyeeyay",
    copyFailed: "Lama koobiyeyn karo. Fadlan qor koodhadhka.",
    download: "Soo deji (.txt)",
    confirm: "Waan kaydiyay",
    // TODO(translate-review)
    fileHeader:
      "Koodhadhka soo celinta Books. Kood kasta hal mar ayuu shaqeeyaa. Si ammaan ah u hay.",
  },
  business: {
    title: "Dooro ganacsiga",
    intro: "Waxaad ka shaqeysaa in ka badan hal ganacsi. Kee hadda?",
    selecting: "Waa la furayaa…",
  },
  role: {
    owner: "Milkiile",
    manager: "Maamule",
    // TODO(translate-review)
    cashier: "Lacag-haye",
    // TODO(translate-review)
    storekeeper: "Bakhaar-haye",
    // TODO(translate-review)
    accountant: "Xisaabiye",
  },
  changePassword: {
    title: "Samee furahaaga sirta ah",
    // TODO(translate-review)
    intro: "Waxaad ku gashay fure ku meel gaar ah. Fadlan hadda dooro furahaaga sirta ah.",
    // TODO(translate-review)
    current: "Furaha ku meel gaarka ah ama kan hadda",
    new: "Furaha sirta ah ee cusub",
    submit: "Kaydi furaha",
  },
  recover: {
    // TODO(translate-review)
    title: "Soo celi akoonkaaga",
    // TODO(translate-review)
    intro:
      "Isticmaal mid ka mid ah koodhadhka soo celinta ee aad kaydisay markaad akoonka samaysay.",
    identifier: "Lambarka taleefanka ama iimaylka",
    // TODO(translate-review)
    code: "Koodka soo celinta",
    newPassword: "Furaha sirta ah ee cusub",
    submit: "Beddel furaha",
    backToLogin: "Ku noqo galitaanka",
  },
  home: {
    greeting: "Salaan, {{name}}",
    business: "Ganacsiga: {{name}}",
    // TODO(translate-review)
    placeholder: "Bogga guud dhawaan ayuu imaan doonaa.",
  },
  install: {
    title: "Ku rakib Books",
    // TODO(translate-review)
    iosBody:
      "iPhone ama iPad: taabo badhanka Share, kadibna “Add to Home Screen”. Books waa in la rakibaa si xogtaadu u ammaan ahaato marka aadan internet haysan.",
    // TODO(translate-review)
    androidBody: "Ku rakib Books qalabkan si uu dhakhso u furmo una shaqeeyo internet la'aan.",
    installButton: "Rakib app-ka",
    dismiss: "Hadda maya",
  },
  errors: {
    // TODO(translate-review)
    validation_failed: "Xog qaar sax ma aha. Fadlan hubi oo isku day mar kale.",
    // TODO(translate-review)
    identifier_taken: "Lambarkan ama iimaylkan horay ayaa loo isticmaalay. Halkii gal.",
    invalid_credentials: "Lambarka, iimaylka ama furaha sirta ah waa khalad.",
    // TODO(translate-review)
    account_locked: "Isku day khaldan oo badan. Akoonka waa la xiray muddo. Mar dambe isku day.",
    too_many_requests: "Isku day badan. Fadlan sug hal daqiiqo oo isku day mar kale.",
    not_authenticated: "Fadlan gal.",
    session_expired: "Waa lagaa saaray. Fadlan mar kale gal.",
    business_not_selected: "Fadlan marka hore dooro ganacsi.",
    not_a_member: "Ka mid ma tihid ganacsigan.",
    // TODO(translate-review)
    invalid_recovery_code: "Koodkan soo celinta sax ma aha ama horay ayaa loo isticmaalay.",
    csrf_header_missing: "Wax baa khaldamay. Fadlan dib u soo rar bogga.",
    network_error: "Server-ka lama gaari karo. Hubi internetkaaga oo isku day mar kale.",
    // TODO(translate-review)
    invalid_response: "Server-ku wuxuu soo diray jawaab aan la filayn. Fadlan isku day mar kale.",
    // TODO(translate-review)
    refresh_in_progress:
      "Fadhigaaga waxaa lagu cusboonaysiinayaa daaqad kale. Fadlan isku day mar kale.",
    unknown: "Wax baa khaldamay. Fadlan isku day mar kale.",
  },
  validation: {
    invalid_phone: "Geli lambar taleefan Kenya ah, sida 0712 345 678.",
    invalid_email: "Geli iimayl sax ah, sida name@example.com.",
    phone_or_email_required: "Geli lambar taleefan ama iimayl.",
    // TODO(translate-review)
    weak_password: "Furaha sirta ah kuma filna. Eeg liiska hoose.",
    name_too_short: "Geli ugu yaraan 2 xaraf.",
    required: "Tan waa loo baahan yahay.",
    check_field: "Fadlan hubi tan.",
  },
};
