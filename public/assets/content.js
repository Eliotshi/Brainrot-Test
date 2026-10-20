/* ============================================================
   CERVEAU CRAMÉ · contenus (axes, niveaux, archétypes, badges)
   ============================================================ */

// Lien de paiement Désintox (Stripe Payment Link, etc.). Vide = bouton « bientôt disponible ».
const CHECKOUT_URL = "";
// URL publique du test, utilisée dans les textes de partage.
const TEST_URL = location.origin;

const AXES = [
  { k:"plume", name:"Plume", full:"Écriture",
    what:"Ce que tu écris encore toi-même : messages, mails, textes.",
    bands:[
      "Tu écris avec tes propres mots. L'IA reste au mieux un correcteur. Ta voix est intacte, et ça s'entend.",
      "L'IA s'est glissée dans tes brouillons. Tu gardes la main sur le fond, mais la forme sonne de moins en moins comme toi.",
      "L'IA tient la plume. Tes textes sont propres et impersonnels, et tes proches commencent à le remarquer." ],
    defis:["Écris ton prochain message important sans IA, puis compare avec ce qu'elle aurait proposé.","Un message par jour 100 % fait main, fautes autorisées.","Relis à voix haute : si ça ne sonne pas comme toi, réécris."],
    week:"Réécrire avec ta voix : 7 messages faits main, du SMS au mail délicat." },
  { k:"pensee", name:"Réflexion", full:"Raisonnement",
    what:"Ta capacité à réfléchir seul·e avant de demander.",
    bands:[
      "Tu réfléchis d'abord, tu demandes ensuite. L'IA te sert à vérifier, pas à penser à ta place.",
      "Le réflexe « je demande » arrive de plus en plus tôt. Tu réfléchis encore, mais moins longtemps.",
      "Le prompt part avant la pensée. Tu obtiens des réponses, mais tu perds l'habitude de les construire." ],
    defis:["Règle des 10 minutes : réfléchis seul·e avant chaque prompt.","Écris ta propre réponse avant de lire celle de l'IA.","Résous un problème par jour sur papier."],
    week:"Penser d'abord : la règle des 10 minutes, appliquée à chaque prompt." },
  { k:"memoire", name:"Mémoire", full:"Mémoire",
    what:"Ce que tu retiens encore, plutôt que de le redemander.",
    bands:[
      "Ta mémoire travaille encore. Tu retiens ce que tu apprends et tu sais le réexpliquer.",
      "Tu retiens les grandes lignes et tu délègues le reste. Le « je redemanderai » s'installe.",
      "L'IA est devenue ton disque dur externe. Ce qu'elle t'explique ne reste pas, alors tu redemandes." ],
    defis:["Après chaque explication de l'IA, résume-la de tête en trois phrases.","Apprends un numéro de téléphone par cœur cette semaine.","Le soir, note trois choses apprises dans la journée, sans regarder."],
    week:"Muscler la mémoire : rappel actif et résumés de tête." },
  { k:"boussole", name:"Décisions", full:"Boussole",
    what:"Qui décide vraiment : toi, ou l'onglet ouvert.",
    bands:[
      "Tu décides toi-même, et tu assumes. L'IA peut éclairer, mais elle ne tranche pas.",
      "Tu demandes de plus en plus souvent « qu'est-ce que tu en penses ? » à une machine. Tu tranches encore, mais avec un filet.",
      "Tu lui confies tes choix, du dîner au déménagement. C'est confortable, mais ta boussole interne rouille." ],
    defis:["Prends trois petites décisions par jour sans rien demander à personne.","Pour une grosse décision, écris ton choix avant de consulter l'IA.","Une soirée sans recommandation : film, plat, sortie, au feeling."],
    week:"Reprendre la boussole : décider d'abord, consulter ensuite." },
  { k:"attention", name:"Attention", full:"Concentration",
    what:"Lire, écouter et rester concentré·e sans résumé.",
    bands:[
      "Tu lis en entier et tu tiens la concentration. Les résumés restent un bonus.",
      "Les textes longs te fatiguent plus qu'avant. Tu lis, mais de plus en plus en diagonale.",
      "Tout passe par le résumé du résumé. Ta concentration fond, et les détails t'échappent." ],
    defis:["Lis un article long en entier, sans résumé, chaque jour.","Une séance de 25 minutes sans IA ni téléphone.","Lis un chapitre de livre avant de dormir."],
    week:"Retrouver le temps long : lecture complète et séances sans écran." },
  { k:"idees", name:"Créativité", full:"Idées",
    what:"Tes idées originales, sans générateur.",
    bands:[
      "Ton imagination tourne toute seule. L'IA ne t'a pas encore volé tes idées sous la douche.",
      "Tu démarres souvent par « donne-moi 10 idées ». C'est efficace, mais tes idées se ressemblent un peu plus.",
      "Tes idées sortent d'un générateur. Elles sont correctes, et ce sont les mêmes que celles de tout le monde." ],
    defis:["Écris 10 idées à toi avant d'en demander une seule à l'IA.","Dix minutes par jour de dessin, d'écriture ou de bricolage, sans aide.","Garde un carnet d'idées et remplis-le pendant une semaine."],
    week:"Rallumer l'imagination : idées perso d'abord, IA en sparring-partner." },
  { k:"coeur", name:"Cœur", full:"Lien affectif",
    what:"La place de l'IA dans tes émotions et tes relations.",
    bands:[
      "Tes émotions et tes relations restent humaines. L'IA n'est pas ta confidente.",
      "L'IA t'aide à formuler ce que tu ressens, parfois plus qu'un·e ami·e. Rien de grave, à surveiller.",
      "L'IA est devenue ta confidente, ta coach et ta plume amoureuse. Tes humain·es méritent une partie de ces conversations." ],
    defis:["Appelle une personne au lieu de lui envoyer un message.","Raconte ta journée à un humain avant d'en parler à l'IA.","Écris un message sincère, maladroit et sans aide à quelqu'un que tu aimes."],
    week:"Rehumaniser tes liens : conversations vraies, sans script." },
  { k:"perroquet", name:"Perroquet", full:"Langage & réflexes",
    what:"À quel point tu as pris le ton et les manies de l'IA.",
    bands:[
      "Tu parles comme toi. Aucune trace de « Excellente question ! » dans ton vocabulaire.",
      "Quelques tics d'IA se sont glissés dans ton langage. Tu les repères encore, c'est bon signe.",
      "Tu parles comme un chatbot, tu lui dis merci et tu le défends en soirée. La fusion est en cours." ],
    defis:["Chasse aux tics : bannis « il est important de noter » et « n'hésitez pas ».","Ferme l'onglet IA pendant une demi-journée.","Remplace une liste à puces par une phrase normale."],
    week:"Retrouver ton langage : désintox des tics et onglet fermé." },
];
const AX = Object.fromEntries(AXES.map(a => [a.k, a]));

const LEVELS = [
  { name:"Bleu",      from:0,  to:20,  col:"#4F7BFF", tag:"Cru, intact, presque suspect.",
    text:"Ton cerveau est encore cru, et c'est une excellente nouvelle. Tu te sers de l'IA comme d'un outil, tu gardes la main sur tes idées et tu sais écrire un message sans aide. Méfie-toi quand même : tout le monde commence par « je l'utilise juste pour vérifier »." },
  { name:"Saignant",  from:20, to:40,  col:"#A04DFF", tag:"Ça commence à grésiller.",
    text:"Ça commence à chauffer. L'IA s'est installée dans ton quotidien : un mail par-ci, un résumé par-là. Rien de grave, mais tu lui confies de plus en plus de petites décisions sans t'en rendre compte. C'est le bon moment pour reprendre les commandes." },
  { name:"À point",   from:40, to:60,  col:"#F0408A", tag:"Parfait pour un steak. Moins pour un cerveau.",
    text:"Cuisson parfaite pour un steak. Pour un cerveau, c'est un signal d'alerte. L'IA pense avant toi une bonne partie de la journée, et démarrer une tâche sans elle devient difficile. Quelques nouvelles habitudes suffisent encore à inverser la tendance." },
  { name:"Bien cuit", from:60, to:80,  col:"#FF7A1A", tag:"Trop longtemps sur le grill.",
    text:"Ton cerveau a passé trop de temps sur le grill. Écrire, résumer, décider, choisir ton dîner : tout passe par l'IA, et ta mémoire comme ta concentration en paient le prix. Tu n'as pas besoin d'arrêter l'IA. Tu as besoin de réapprendre à t'en servir sans qu'elle te remplace." },
  { name:"Carbonisé", from:80, to:101, col:"#FFD23F", tag:"Il reste quelques braises.",
    text:"L'IA est devenue ta mémoire, ta plume et ta boussole. Tu lui dis bonjour le matin, et sûrement merci. Pas de panique : un cerveau, ça se régénère. Mais il va falloir une vraie cure de désintox." },
];
const tempOf = s => 42 + s * 0.5;           // score 0..100 → °C
const levelOf = s => LEVELS.find(L => s >= L.from && s < L.to) || LEVELS[4];

/* 12 archétypes. "dom" = axe dominant (archétypes d'axe) */
const ARCHETYPES = {
  bleu:      { name:"Cerveau Bleu", tag:"Le dernier cerveau cru de la cuisine.",
    desc:"Tu utilises l'IA comme un tournevis : quand il faut, et tu la ranges après. Tu écris, tu décides et tu retiens par toi-même. Dans un monde de copier-coller, tu es une espèce rare et précieuse.",
    forces:["Pensée autonome","Voix authentique","Mémoire entraînée"],
    angles:["Tu passes peut-être à côté de gains de temps réels","Risque de te sentir à part dans un groupe très IA","La tentation arrive toujours par « juste pour vérifier »"],
    ref:"Sherlock Holmes avant l'invention du Wi-Fi", ally:"cyborg", clash:"carbo" },
  carbo:     { name:"Carbonisé Intégral", tag:"Fusion complète avec la machine.",
    desc:"Écriture, décisions, mémoire, émotions : tout passe par l'IA. Tu es d'une efficacité redoutable tant que les serveurs tiennent. Le jour où ils tombent, c'est l'écran noir, chez toi aussi.",
    forces:["Productivité maximale","Maîtrise de tous les outils","Zéro friction"],
    angles:["Dépendance totale aux serveurs","Voix et idées qui ressemblent à celles de tout le monde","Mémoire et attention en chute libre"],
    ref:"Wall-E, version humains du vaisseau", ally:"equi", clash:"bleu" },
  equi:      { name:"Équilibriste Tiède", tag:"Ni cru ni cramé, partout un peu.",
    desc:"Ton usage de l'IA est réparti de façon étonnamment homogène : un peu sur chaque axe, jamais trop. C'est sain, à condition que ça ne glisse pas doucement vers le haut, partout à la fois.",
    forces:["Usage réfléchi","Bonne capacité d'adaptation","Pas de point faible critique"],
    angles:["Une dérive lente, invisible, sur tous les axes","Difficile de savoir par où commencer","Le tiède finit souvent par chauffer"],
    ref:"Boucle d'or, qui veut que tout soit « juste comme il faut »", ally:"pensee", clash:"carbo" },
  cyborg:    { name:"Cyborg Fonctionnel", tag:"La machine au boulot, le cœur à la maison.",
    desc:"Tu délègues massivement le travail intellectuel (écrire, résumer, retenir) mais tu gardes tes émotions, tes relations et tes décisions bien humaines. Un pacte assumé avec la machine, tant que la frontière tient.",
    forces:["Productivité très élevée","Vie affective protégée","Usage lucide et assumé"],
    angles:["Les compétences de base s'érodent en silence","La frontière boulot/perso est poreuse","Dur de travailler sans connexion"],
    ref:"Iron Man : l'armure fait le travail, Tony garde le caractère", ally:"bleu", clash:"coeur" },
  plume:     { name:"Copier-Coller", tag:"Ta plume a un abonnement mensuel.",
    desc:"Ton axe le plus cramé, c'est l'écriture. Mails, messages, posts : l'IA rédige, tu valides. Le résultat est propre, mais ta voix s'efface petit à petit, et tes proches finissent par reconnaître le style.",
    forces:["Messages toujours clairs","Rapide à l'écrit","Jamais de faute"],
    angles:["Ta voix personnelle disparaît","Risque de gaffe « Voici votre message : »","Écrire seul·e devient angoissant"],
    ref:"Cyrano de Bergerac, mais Cyrano est un serveur", ally:"idees", clash:"bleu" },
  pensee:    { name:"Pilote Automatique", tag:"La question part avant la pensée.",
    desc:"Ton axe le plus cramé, c'est la réflexion. Dès qu'un problème se présente, ton premier réflexe est de demander. Tu obtiens vite des réponses, mais tu perds l'habitude de les construire.",
    forces:["Résolution express","Bon·ne en formulation de questions","Jamais bloqué·e longtemps"],
    angles:["Tu comprends moins ce que tu sais","Tu es en difficulté sans connexion","Tu acceptes facilement des erreurs de l'IA"],
    ref:"Un GPS qui ne connaît plus la route sans réseau", ally:"memoire", clash:"bleu" },
  memoire:   { name:"Disque Externe", tag:"Pourquoi retenir, puisqu'on peut redemander ?",
    desc:"Ton axe le plus cramé, c'est la mémoire. Ce que l'IA t'explique ne reste pas, alors tu redemandes. Ton cerveau a confié le stockage au cloud, et ça se sent en réunion comme en soirée.",
    forces:["Accès instantané à l'info","Esprit libéré du « par cœur »","Grande curiosité"],
    angles:["Tu redemandes les mêmes choses","Moins d'aisance à l'oral","Tes connaissances restent en surface"],
    ref:"Dory du Monde de Nemo, avec un abonnement premium", ally:"pensee", clash:"attention" },
  boussole:  { name:"Boussole Déléguée", tag:"« Qu'est-ce que tu en penses ? », à une machine.",
    desc:"Ton axe le plus cramé, ce sont les décisions. Du dîner au déménagement, tu demandes à l'IA de trancher. C'est reposant, mais ta boussole interne rouille, et ton intuition n'est plus consultée.",
    forces:["Décisions rapides et argumentées","Peu de regrets impulsifs","Recherche toujours documentée"],
    angles:["Ton intuition s'atrophie","Tu as du mal à assumer tes choix","Tes préférences deviennent celles de l'algorithme"],
    ref:"Un Tamagotchi qui laisse l'appli décider quand manger", ally:"coeur", clash:"bleu" },
  attention: { name:"Résumé du Résumé", tag:"Trop long, pas lu. Même le résumé.",
    desc:"Ton axe le plus cramé, c'est l'attention. Tu ne lis plus, tu fais résumer, puis tu survoles le résumé. Tu gagnes du temps, mais les détails t'échappent et le temps long devient insupportable.",
    forces:["Ultra-rapide pour traiter l'info","Bon flair pour l'essentiel","Jamais noyé·e sous les documents"],
    angles:["Les détails t'échappent","Ta concentration fond","Les livres deviennent un défi"],
    ref:"Un poisson rouge sous caféine", ally:"perroquet", clash:"memoire" },
  idees:     { name:"Idées Prêt-à-Porter", tag:"Dix idées en une seconde, aucune à toi.",
    desc:"Ton axe le plus cramé, c'est la créativité. Tu commences tout par « donne-moi 10 idées ». Ça marche, mais tes idées ressemblent à celles des autres, parce qu'elles viennent du même endroit.",
    forces:["Jamais à court d'options","Brainstorms très efficaces","Bon·ne curateur·rice"],
    angles:["Idées interchangeables","Peur de la page blanche","Moins de fierté sur ce que tu crées"],
    ref:"Un DJ qui ne passe que la playlist « Top 50 »", ally:"plume", clash:"cyborg" },
  coeur:     { name:"Âme Sœur Synthétique", tag:"Ta confidente répond en 0,3 seconde.",
    desc:"Ton axe le plus cramé, c'est le lien affectif. L'IA t'écoute, te conseille et t'aide à écrire à ton crush. Elle est toujours disponible, mais tes humain·es méritent aussi ces conversations.",
    forces:["Bonne conscience de tes émotions","Messages toujours bienveillants","Tu demandes de l'aide facilement"],
    angles:["Relations humaines moins nourries","Tu dépends d'elle pour dire ce que tu ressens","Les conversations vraies deviennent intimidantes"],
    ref:"Theodore dans « Her », juste avant la révélation", ally:"boussole", clash:"cyborg" },
  perroquet: { name:"Perroquet Stochastique", tag:"« Excellente question ! » est ton bonjour.",
    desc:"Ton axe le plus cramé, c'est le langage. Tu as pris le ton, les tics et les tournures de l'IA. Tu lui dis merci, tu la défends en soirée, et tes textos ont des listes à puces.",
    forces:["Communication très structurée","Ton toujours poli","Expert·e des outils"],
    angles:["Tu parles comme un chatbot","On repère tes textes d'IA à 10 km","Ton identité se mélange à celle de l'outil"],
    ref:"C-3PO, protocole de politesse inclus", ally:"attention", clash:"bleu" },
};

/* Badges · id → règles évaluées en direct (voir engine) */
const BADGES = [
  { id:"start",    name:"Thermomètre planté", desc:"Tu as répondu à ta première question.", icon:"thermo" },
  { id:"plume0",   name:"Plume d'origine",    desc:"Une réponse 100 % fait main côté écriture.", icon:"feather" },
  { id:"parrot",   name:"Perroquet certifié", desc:"Tu as avoué un tic de langage d'IA.", icon:"bubble" },
  { id:"ice3",     name:"Combo glacier",      desc:"Trois réponses crues d'affilée.", icon:"snow" },
  { id:"fire3",    name:"Combo braise",       desc:"Trois réponses cramées d'affilée.", icon:"flame" },
  { id:"digger",   name:"Creuseur·se",        desc:"Tu as débloqué une question bonus.", icon:"drill" },
  { id:"digger3",  name:"Spéléologue",        desc:"Trois questions bonus débloquées.", icon:"drill" },
  { id:"honest",   name:"Honnêteté brûlante", desc:"Cinq réponses au maximum de cuisson.", icon:"flame" },
  { id:"half",     name:"Mi-cuisson",         desc:"Tu as passé la moitié du test.", icon:"half" },
  { id:"resist",   name:"Résistant·e",        desc:"Un chapitre entier en mode cru.", icon:"shield" },
  { id:"palette",  name:"Nuancier complet",   desc:"Tu as utilisé tous les niveaux de réponse.", icon:"palette" },
  { id:"speed",    name:"Réflexes de chef",   desc:"Cinq réponses en moins de 20 secondes.", icon:"bolt" },
  { id:"heart",    name:"Cœur d'artichaut",   desc:"Trois réponses chaudes côté cœur.", icon:"heart" },
  { id:"reader",   name:"Lecteur·rice d'élite", desc:"Tu as lu la question piège jusqu'au bout.", icon:"eye" },
  { id:"marathon", name:"Marathon",           desc:"Tu as fini le diagnostic complet.", icon:"medal" },
];

const CHAPTERS = ["Préchauffage","Saisie","Mijotage","Gratin","Flambage"];

const REACTIONS = [
  ["Cerveau cru, respect.","Froid comme un frigo.","100 % fait main.","Aucune braise ici.","Le thermomètre baille."],
  ["Ça tiédit…","Petit feu.","Rien d'alarmant, pour l'instant.","Légère chaleur détectée.","On reste raisonnable."],
  ["Ça grésille.","Le grill s'allume.","Hmm. Noté.","Odeur de toast détectée.","Ça chauffe sérieusement."],
  ["Aïe. Ça sent le brûlé.","Thermomètre affolé.","Flambé !","Alerte incendie.","Les pompiers sont prévenus."],
];

/* ------------------------------------------------------------
   PANEL DE RÉFÉRENCE MODÉLISÉ
   Moyennes par axe (0-100) et écart-type. Ce sont des hypothèses
   de départ, pas des mesures : remplace-les par tes vraies stats
   dès que tu as assez de joueurs.
   ------------------------------------------------------------ */
const PANEL = {
  sd: 20,
  base: {
    etu: { plume:52, pensee:48, memoire:44, boussole:38, attention:55, idees:45, coeur:36, perroquet:46 },
    pro: { plume:50, pensee:42, memoire:40, boussole:34, attention:46, idees:40, coeur:26, perroquet:38 },
  },
  age: { "18-24":5, "25-34":2, "35-44":-3, "45+":-8 },
};
const PROFILES = { etu:"Étudiant·e / jeune actif·ve", pro:"Professionnel·le en poste" };
const PROFILES_PL = { etu:"étudiant·es et jeunes actif·ves", pro:"pros" };
const AGES = ["18-24","25-34","35-44","45+"];

/* ------------------------------------------------------------
   CHAPITRE BONUS · « Ton plan de sauvetage »
   Sert à personnaliser le plan ET à qualifier le lead (CRM).
   Les codes "v" sont lus par lib/scoring.js côté serveur.
   ------------------------------------------------------------ */
const QUAL = [
  { id:"situation", q:"Pour adapter ton plan : ta situation aujourd'hui ?",
    a:{ etu:["Étudiant·e","En alternance ou en stage","Jeune actif·ve (CDI, CDD)","Freelance ou en recherche d'emploi"],
        pro:["Salarié·e","Manager ou cadre","Indépendant·e ou freelance","Dirigeant·e ou fondateur·rice"] },
    v:{ etu:["etudiant","alternance","jeune_actif","freelance_recherche"],
        pro:["salarie","manager","independant","dirigeant"] } },
  { id:"spend", q:"Cette année, pour apprendre ou te former (cours en ligne, livres, coaching), tu as dépensé…",
    a:["Rien du tout","Moins de 50 €","Entre 50 et 300 €","Plus de 300 €"], v:["0","lt50","50_300","gt300"] },
  { id:"payer", q:"Si un programme t'aidait vraiment à reprendre le contrôle, qui le financerait ?",
    a:["Personne, je cherche du gratuit","Moi","Mon employeur ou un budget formation","Moi ou mon employeur, peu importe"], v:["free","self","employer","either"] },
  { id:"wish", q:"Sur 10, à quel point as-tu envie de reprendre le contrôle sur l'IA ?", t:"n" },
];
