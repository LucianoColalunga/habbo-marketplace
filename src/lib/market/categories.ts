import { FURNI_FLAGS, type CatalogItem } from "@/lib/habbo/furnidata";
import type { Lang } from "@/lib/i18n/config";
import { normalizeText } from "@/lib/text";

/**
 * Categorías de furnis por tipo, uso o característica. Habbo solo trae una
 * categoría gruesa (casi 70 % dice "other"), así que se combinan:
 *  - el nombre interno (classname), que está en inglés y es igual en todos los hoteles;
 *  - los usos del furnidata (sentarse, acostarse, caminar encima);
 *  - el ambiente y la línea del furni;
 *  - y, como respaldo, palabras del nombre en el idioma del hotel.
 * Un furni puede estar en varias categorías (un sofá de Navidad está en
 * "Asientos" y en "Fechas especiales").
 */

type Labels = Record<Lang, string>;
type Words = Record<Lang, string[]>;
type Rule = (i: Item) => boolean;

interface Item extends CatalogItem {
  /** classname en minúsculas, sin el "*n" del color. */
  key: string;
  /** Nombre en minúsculas y sin tildes. */
  name: string;
}

export interface SubcategoryDef {
  slug: string;
  label: Labels;
  words: Words;
  match: Rule;
}

export interface CategoryDef {
  slug: string;
  label: Labels;
  words: Words;
  match: Rule;
  subs: SubcategoryDef[];
}

export { normalizeText };

const key = (r: RegExp): Rule => (i) => r.test(i.key);
const name = (r: RegExp): Rule => (i) => r.test(i.name);
const cat = (...cs: string[]): Rule => (i) => cs.includes(i.c);
const env = (...es: string[]): Rule => (i) => !!i.e && es.includes(i.e);
const line = (...ls: string[]): Rule => (i) => ls.includes(i.l);
const flag = (f: number): Rule => (i) => ((i.f ?? 0) & f) !== 0;
const any = (...rules: Rule[]): Rule => (i) => rules.some((r) => r(i));
const all = (...rules: Rule[]): Rule => (i) => rules.every((r) => r(i));
const not = (r: Rule): Rule => (i) => !r(i);
const floorItem: Rule = (i) => i.t === "r";

const L = (es: string, pt: string, en: string): Labels => ({ es, pt, en });
const W = (es: string[], pt: string[], en: string[]): Words => ({ es, pt, en });
const sub = (slug: string, label: Labels, words: Words, match: Rule): SubcategoryDef => ({ slug, label, words, match });

export const CATEGORIES: CategoryDef[] = [
  {
    slug: "asientos",
    label: L("Asientos", "Assentos", "Seating"),
    words: W(["asiento", "asientos", "silla", "sillas"], ["assento", "assentos", "cadeira", "cadeiras"], ["seat", "seats", "seating", "chair", "chairs"]),
    match: any(flag(FURNI_FLAGS.sit), cat("chair")),
    subs: [
      sub("sofas", L("Sofás", "Sofás", "Sofas"), W(["sofa", "sofas"], ["sofa", "sofas"], ["sofa", "sofas", "couch", "couches"]),
        all(any(key(/sofa|couch|settee|divan/), name(/\bsofa|\bcouch|\bdivan/)), not(key(/sofachair/)))),
      sub("sillas", L("Sillas", "Cadeiras", "Chairs"), W(["silla", "sillas"], ["cadeira", "cadeiras"], ["chair", "chairs"]),
        any(key(/(^|_)chair/), name(/\bsilla|\bcadeira|\bchair/))),
      sub("sillones", L("Sillones", "Poltronas", "Armchairs"), W(["sillon", "sillones", "butaca", "butacas"], ["poltrona", "poltronas"], ["armchair", "armchairs"]),
        any(key(/sofachair|armchair|recliner/), name(/\bsillon|\bbutaca|\bpoltrona|armchair/))),
      sub("taburetes", L("Taburetes", "Banquetas", "Stools"), W(["taburete", "taburetes"], ["banqueta", "banquetas"], ["stool", "stools"]),
        any(key(/stool/), name(/\btaburete|\bbanqueta|\bstool/))),
      sub("bancos", L("Bancos", "Bancos", "Benches"), W(["banco", "bancos"], ["banco", "bancos"], ["bench", "benches"]),
        any(key(/bench/), name(/\bbanco\b|\bbancos\b|\bbench/))),
      sub("tronos", L("Tronos", "Tronos", "Thrones"), W(["trono", "tronos"], ["trono", "tronos"], ["throne", "thrones"]),
        any(key(/throne/), name(/\btrono|\bthrone/))),
      sub("pufs", L("Pufs y almohadones", "Pufes e almofadas", "Pouffes & cushions"), W(["puf", "pufs", "almohadon", "almohadones", "cojin"], ["pufe", "pufes", "almofada", "almofadas"], ["pouf", "pouffe", "cushion", "cushions", "beanbag"]),
        any(key(/pouf|pillow|cushion|beanbag|bean_bag/), name(/\bpuf|almohad|\bcojin|almofada|\bpillow|\bcushion/))),
    ],
  },
  {
    slug: "camas",
    label: L("Camas", "Camas", "Beds"),
    words: W(["cama", "camas", "dormir"], ["cama", "camas"], ["bed", "beds"]),
    match: any(flag(FURNI_FLAGS.lay), cat("bed"), key(/(^|_)bed|sleepingbag|hammock/)),
    subs: [
      sub("camas", L("Camas", "Camas", "Beds"), W(["cama", "camas"], ["cama", "camas"], ["bed", "beds"]),
        all(any(key(/bed/), name(/\bcama\b|\bcamas\b|\bbed\b/)), not(key(/sleepingbag/)))),
      sub("sacos-de-dormir", L("Sacos de dormir", "Sacos de dormir", "Sleeping bags"), W(["saco de dormir"], ["saco de dormir"], ["sleeping bag"]),
        any(key(/sleepingbag/), name(/saco de dormir|sleeping bag/))),
      sub("hamacas", L("Hamacas y reposeras", "Redes e espreguiçadeiras", "Hammocks & loungers"), W(["hamaca", "hamacas", "reposera", "tumbona"], ["rede", "redes", "espreguicadeira"], ["hammock", "lounger", "deckchair"]),
        any(key(/hammock|lounger|deckchair|sunbed/), name(/\bhamaca|reposera|tumbona|\brede\b|espreguicadeira|hammock|lounger/))),
    ],
  },
  {
    slug: "mesas",
    label: L("Mesas", "Mesas", "Tables"),
    words: W(["mesa", "mesas", "escritorio"], ["mesa", "mesas", "escrivaninha"], ["table", "tables", "desk"]),
    match: any(cat("table"), key(/table|desk|counter/), name(/\bmesa|\btable|\bescritorio|escrivaninha/)),
    subs: [
      sub("mesas", L("Mesas", "Mesas", "Tables"), W(["mesa", "mesas"], ["mesa", "mesas"], ["table", "tables"]), any(key(/table/), name(/\bmesa|\btable/))),
      sub("escritorios", L("Escritorios", "Escrivaninhas", "Desks"), W(["escritorio", "escritorios"], ["escrivaninha"], ["desk", "desks"]),
        any(all(key(/desk/), not(key(/bardesk/))), name(/\bescritorio|escrivaninha|\bdesk/))),
      sub("barras", L("Barras y mostradores", "Balcões", "Bars & counters"), W(["barra", "barras", "mostrador"], ["balcao", "balcoes"], ["bar", "counter"]),
        any(key(/bardesk|counter|(^|_)bar(_|$)/), name(/\bbarra\b|mostrador|balcao|\bcounter/))),
    ],
  },
  {
    slug: "pisos",
    label: L("Pisos y alfombras", "Pisos e tapetes", "Floors & rugs"),
    words: W(["piso", "pisos", "suelo", "suelos", "baldosa", "baldosas", "alfombra", "alfombras"], ["piso", "pisos", "chao", "tapete", "tapetes", "azulejo"], ["floor", "floors", "tile", "tiles", "rug", "rugs", "carpet"]),
    match: all(floorItem, not(cat("roller")), not(key(/queue_tile/)), any(cat("floor", "rug"), key(/tile|floor|rug|carpet|(^|_)mat(_|$)|grass|lawn/), name(/baldosa|\bsuelo|\bpiso\b|\bpisos\b|alfombra|\btapete|\brug\b|carpet|\btile|azulejo|cesped|\bgrama/))),
    subs: [
      sub("alfombras", L("Alfombras", "Tapetes", "Rugs"), W(["alfombra", "alfombras"], ["tapete", "tapetes"], ["rug", "rugs", "carpet"]),
        any(key(/rug|carpet|(^|_)mat(_|$)/), name(/alfombra|\btapete|\brug\b|carpet/))),
      sub("baldosas", L("Baldosas y suelos", "Pisos e azulejos", "Tiles & floors"), W(["baldosa", "baldosas", "suelo", "suelos"], ["azulejo", "azulejos", "chao"], ["tile", "tiles"]),
        any(key(/tile|floor/), name(/baldosa|\bsuelo|\bpiso\b|azulejo|\btile|\bfloor/))),
      sub("cesped", L("Césped y tierra", "Grama e terra", "Grass & ground"), W(["cesped", "pasto", "arena"], ["grama", "areia"], ["grass", "sand"]),
        any(key(/grass|lawn|sand|dirt/), name(/cesped|\bpasto\b|\bgrama|\barena\b|\bareia|\bgrass|\bsand\b/))),
    ],
  },
  {
    slug: "iluminacion",
    label: L("Iluminación", "Iluminação", "Lighting"),
    words: W(["luz", "luces", "lampara", "lamparas", "vela", "velas", "iluminacion"], ["luz", "luzes", "luminaria", "abajur", "vela", "velas", "iluminacao"], ["light", "lights", "lamp", "lamps", "candle", "candles", "lighting"]),
    match: any(cat("lighting", "dimmer"), key(/lamp|light|candle|(^|_)cnd(_|$)|lantern|torch|chandelier|neon|dimmer/), name(/lampara|\bluz\b|\bluces|\bvela\b|\bvelas\b|luminaria|abajur|\blamp|\blight|candle|\bneon/)),
    subs: [
      sub("lamparas", L("Lámparas", "Luminárias", "Lamps"), W(["lampara", "lamparas"], ["luminaria", "abajur"], ["lamp", "lamps"]),
        any(key(/lamp|chandelier|lantern/), name(/lampara|luminaria|abajur|\blamp|lantern|\bfarol/))),
      sub("velas", L("Velas", "Velas", "Candles"), W(["vela", "velas"], ["vela", "velas"], ["candle", "candles"]), any(key(/candle|(^|_)cnd(_|$)/), name(/\bvela\b|\bvelas\b|candle/))),
      sub("neon", L("Neón", "Neon", "Neon"), W(["neon"], ["neon"], ["neon"]), any(key(/neon/), name(/\bneon/))),
    ],
  },
  {
    slug: "pared",
    label: L("Decoración de pared", "Decoração de parede", "Wall decor"),
    words: W(["pared", "cuadro", "cuadros", "poster", "posters", "ventana", "ventanas"], ["parede", "quadro", "quadros", "poster", "janela", "janelas"], ["wall", "poster", "posters", "painting", "paintings", "window"]),
    match: any((i) => i.t === "w", cat("wall_decoration", "window")),
    subs: [
      sub("cuadros", L("Cuadros y pósters", "Quadros e pôsteres", "Paintings & posters"), W(["cuadro", "cuadros", "poster", "posters"], ["quadro", "quadros", "poster"], ["painting", "paintings", "poster", "posters"]),
        any(key(/painting|picture|poster|frame|photo|portrait/), name(/\bcuadro|\bposter|\bquadro|\bpintura|painting|retrato|portrait/))),
      sub("ventanas", L("Ventanas", "Janelas", "Windows"), W(["ventana", "ventanas"], ["janela", "janelas"], ["window", "windows"]),
        any(cat("window"), key(/window|(^|_)win(_|$)/), name(/ventana|janela|window/))),
      sub("banderas", L("Banderas", "Bandeiras", "Flags"), W(["bandera", "banderas"], ["bandeira", "bandeiras"], ["flag", "flags"]), any(key(/flag/), name(/bandera|bandeira|\bflag/))),
    ],
  },
  {
    slug: "separadores",
    label: L("Separadores y puertas", "Divisórias e portas", "Dividers & gates"),
    words: W(["puerta", "puertas", "valla", "vallas", "separador", "separadores", "biombo"], ["porta", "portas", "portao", "cerca", "divisoria"], ["gate", "gates", "door", "doors", "fence", "divider"]),
    match: all(floorItem, any(cat("divider", "gate"), key(/gate|door|fence|divider|(^|_)div(_|$)|screen|hedge|pillar|column|railing/), name(/puerta|\bvalla|separador|biombo|\bporta\b|portao|\bcerca\b|divisoria|\bgate|\bdoor|fence|divider/))),
    subs: [
      sub("puertas", L("Puertas y portones", "Portas e portões", "Doors & gates"), W(["puerta", "puertas", "porton"], ["porta", "portas", "portao"], ["door", "doors", "gate", "gates"]),
        any(cat("gate"), key(/gate|door/), name(/puerta|porton|\bporta\b|portao|\bgate|\bdoor/))),
      sub("vallas", L("Vallas y cercas", "Cercas", "Fences"), W(["valla", "vallas", "cerca", "seto"], ["cerca", "cercas"], ["fence", "fences", "hedge"]),
        any(key(/fence|railing|hedge/), name(/\bvalla|\bcerca\b|\bseto\b|fence|hedge/))),
      sub("biombos", L("Biombos y paredes", "Biombos e paredes", "Screens & walls"), W(["biombo", "biombos", "separador"], ["biombo", "divisoria"], ["screen", "divider", "wall"]),
        any(key(/divider|(^|_)div(_|$)|screen|(^|_)wall(_|$)/), name(/biombo|separador|divisoria|\bscreen|divider/))),
      sub("columnas", L("Columnas", "Colunas", "Pillars"), W(["columna", "columnas"], ["coluna", "colunas"], ["pillar", "pillars", "column"]), any(key(/pillar|column/), name(/columna|coluna|pillar|column/))),
    ],
  },
  {
    slug: "almacenamiento",
    label: L("Estantes y armarios", "Estantes e armários", "Shelves & storage"),
    words: W(["estante", "estantes", "armario", "armarios", "biblioteca", "cofre"], ["estante", "estantes", "armario", "armarios", "bau"], ["shelf", "shelves", "wardrobe", "cabinet", "chest"]),
    match: any(cat("shelf"), key(/shelf|bookcase|cabinet|wardrobe|closet|cupboard|chest|drawer|locker|dresser/), name(/estante|armario|biblioteca|\bcofre|cajonera|comoda|\bbau\b|\bshelf|wardrobe|cabinet|\bchest\b/)),
    subs: [
      sub("estantes", L("Estantes", "Estantes", "Shelves"), W(["estante", "estantes", "biblioteca"], ["estante", "prateleira"], ["shelf", "shelves", "bookcase"]),
        any(key(/shelf|bookcase/), name(/estante|biblioteca|prateleira|\bshelf|bookcase/))),
      sub("armarios", L("Armarios y cómodas", "Armários e cômodas", "Cabinets & dressers"), W(["armario", "armarios", "comoda"], ["armario", "comoda"], ["cabinet", "wardrobe", "dresser"]),
        any(key(/cabinet|wardrobe|closet|cupboard|drawer|locker|dresser/), name(/armario|comoda|cajonera|guarda-roupa|wardrobe|cabinet|dresser/))),
      sub("cofres", L("Cofres", "Baús", "Chests"), W(["cofre", "cofres", "baul"], ["bau", "baus"], ["chest", "chests", "treasure"]), any(key(/chest|treasure/), name(/\bcofre|\bbaul|\bbau\b|\bchest\b|treasure/))),
    ],
  },
  {
    slug: "naturaleza",
    label: L("Plantas y naturaleza", "Plantas e natureza", "Plants & nature"),
    words: W(["planta", "plantas", "arbol", "arboles", "flor", "flores", "jardin", "naturaleza"], ["planta", "plantas", "arvore", "arvores", "flor", "flores", "jardim", "natureza"], ["plant", "plants", "tree", "trees", "flower", "flowers", "garden", "nature"]),
    match: any(env("nature", "countryside"), key(/plant|tree|flower|bush|garden|cactus|palm|(^|_)rose|tulip|(^|_)rock|pond/), name(/\bplanta|\barbol|\bflor\b|\bflores\b|arbusto|\bjardin|cactus|palmera|\barvore|\bjardim|\bplant|\btree|flower|garden/)),
    subs: [
      sub("plantas", L("Plantas", "Plantas", "Plants"), W(["planta", "plantas", "arbusto"], ["planta", "plantas"], ["plant", "plants", "bush"]),
        any(key(/plant|bush|cactus|fern/), name(/\bplanta|arbusto|cactus|helecho|\bplant|\bbush/))),
      sub("arboles", L("Árboles", "Árvores", "Trees"), W(["arbol", "arboles", "palmera"], ["arvore", "arvores", "palmeira"], ["tree", "trees", "palm"]),
        any(key(/tree|palm/), name(/\barbol|palmera|\barvore|palmeira|\btree|\bpalm\b/))),
      sub("flores", L("Flores", "Flores", "Flowers"), W(["flor", "flores"], ["flor", "flores"], ["flower", "flowers"]),
        any(key(/flower|(^|_)rose|tulip|sunflower|lily/), name(/\bflor\b|\bflores\b|tulipan|girasol|\bflower|\brose\b/))),
      sub("agua", L("Agua y fuentes", "Água e fontes", "Water & fountains"), W(["fuente", "fuentes", "agua", "estanque", "piscina"], ["fonte", "fontes", "agua", "lago", "piscina"], ["fountain", "fountains", "water", "pond", "pool"]),
        any(key(/fountain|pond|(^|_)pool|water/), name(/\bfuente|estanque|piscina|\bagua\b|\bfonte|\blago\b|fountain|\bpond|\bpool|water/))),
    ],
  },
  {
    slug: "cocina-bano",
    label: L("Cocina y baño", "Cozinha e banheiro", "Kitchen & bathroom"),
    words: W(["cocina", "bano", "heladera", "inodoro", "ducha"], ["cozinha", "banheiro", "geladeira"], ["kitchen", "bathroom", "fridge", "toilet", "shower"]),
    match: any(env("kitchen", "bathroom"), key(/ktchn|kitchen|fridge|oven|stove|sink|toilet|(^|_)loo(_|$)|(^|_)bath|shower|(^|_)tub(_|$)/), name(/\bcocina|heladera|nevera|\bhorno|fregadero|inodoro|\bbano\b|\bducha|banera|cozinha|geladeira|\bfogao|banheiro|chuveiro|kitchen|fridge|\boven|toilet|\bbath|shower/)),
    subs: [
      sub("cocina", L("Cocina", "Cozinha", "Kitchen"), W(["cocina", "heladera", "horno"], ["cozinha", "geladeira", "fogao"], ["kitchen", "fridge", "oven"]),
        any(env("kitchen"), key(/ktchn|kitchen|fridge|oven|stove|sink/), name(/\bcocina|heladera|nevera|\bhorno|fregadero|cozinha|geladeira|\bfogao|kitchen|fridge|\boven/))),
      sub("bano", L("Baño", "Banheiro", "Bathroom"), W(["bano", "inodoro", "ducha", "banera"], ["banheiro", "chuveiro", "banheira"], ["bathroom", "toilet", "shower", "bath"]),
        any(env("bathroom"), key(/toilet|(^|_)loo(_|$)|(^|_)bath|shower|(^|_)tub(_|$)/), name(/inodoro|\bbano\b|\bducha|banera|banheiro|chuveiro|banheira|toilet|\bbath|shower/))),
    ],
  },
  {
    slug: "comida",
    label: L("Comida y máquinas", "Comida e máquinas", "Food & machines"),
    words: W(["comida", "bebida", "maquina", "maquinas", "helado"], ["comida", "bebida", "maquina", "maquinas", "sorvete"], ["food", "drink", "drinks", "machine", "vending"]),
    match: any(cat("vending_machine", "food"), key(/vending|icecream|cake|food|drink|(^|_)cola|coffee|pizza|burger|candy/), name(/comida|bebida|\bmaquina|helado|\bpastel|\btorta|sorvete|\bbolo\b|\bfood|\bdrink|vending|ice cream|coffee/)),
    subs: [
      sub("maquinas", L("Máquinas expendedoras", "Máquinas", "Vending machines"), W(["maquina", "maquinas", "expendedora"], ["maquina", "maquinas"], ["machine", "machines", "vending"]),
        any(cat("vending_machine"), key(/vending|machine|dispenser/), name(/\bmaquina|dispensador|vending|machine/))),
      sub("comida", L("Comida y bebida", "Comida e bebida", "Food & drink"), W(["comida", "bebida", "helado", "torta"], ["comida", "bebida", "sorvete", "bolo"], ["food", "drink", "cake", "candy"]),
        any(cat("food"), key(/icecream|cake|food|pizza|burger|candy|drink/), name(/comida|bebida|helado|\bpastel|\btorta|\bdulce|sorvete|\bbolo\b|\bdoce\b|\bfood|\bcake|candy|ice cream/))),
    ],
  },
  {
    slug: "wired",
    label: L("Wired", "Wired", "Wired"),
    words: W(["wired"], ["wired"], ["wired"]),
    match: any((i) => i.c.startsWith("wired"), line("wired")),
    subs: [
      sub("disparadores", L("Disparadores", "Gatilhos", "Triggers"), W(["disparador", "disparadores"], ["gatilho", "gatilhos"], ["trigger", "triggers"]), cat("wired_trigger")),
      sub("efectos", L("Efectos", "Efeitos", "Effects"), W(["efecto", "efectos"], ["efeito", "efeitos"], ["effect", "effects"]), cat("wired_effect")),
      sub("condiciones", L("Condiciones", "Condições", "Conditions"), W(["condicion", "condiciones"], ["condicao", "condicoes"], ["condition", "conditions"]), cat("wired_condition")),
      sub("complementos", L("Complementos", "Complementos", "Add-ons"), W(["complemento", "complementos"], ["complemento", "complementos"], ["add-on", "addon", "addons"]), cat("wired_add_on")),
    ],
  },
  {
    slug: "juegos",
    label: L("Juegos", "Jogos", "Games"),
    words: W(["juego", "juegos"], ["jogo", "jogos"], ["game", "games"]),
    match: any(cat("games"), env("battle_banzai", "freeze", "football", "ice_hockey", "ice_tag", "rollerskates", "lost_monkey"), key(/(^|_)bb_|freeze|fball|football|soccer|hockey|dice|arcade/)),
    subs: [
      sub("banzai", L("Battle Banzai", "Battle Banzai", "Battle Banzai"), W(["banzai"], ["banzai"], ["banzai"]), any(env("battle_banzai"), key(/(^|_)bb_/))),
      sub("freeze", L("Freeze", "Freeze", "Freeze"), W(["freeze"], ["freeze"], ["freeze"]), any(env("freeze"), key(/freeze/))),
      sub("futbol", L("Fútbol", "Futebol", "Football"), W(["futbol", "pelota"], ["futebol", "bola"], ["football", "soccer"]), any(env("football"), key(/fball|football|soccer/))),
      sub("dados", L("Dados", "Dados", "Dice"), W(["dado", "dados"], ["dado", "dados"], ["dice"]), any(key(/dice/), name(/\bdado|\bdice\b/))),
    ],
  },
  {
    slug: "mascotas",
    label: L("Mascotas", "Mascotes", "Pets"),
    words: W(["mascota", "mascotas"], ["mascote", "mascotes", "pet", "pets"], ["pet", "pets"]),
    match: any(cat("pets"), key(/(^|_)pet|nest|kennel|catnip|scratch/), name(/mascota|mascote|\bpet\b|\bnido|\bcucha|comedero/)),
    subs: [
      sub("nidos", L("Camas y nidos", "Camas e ninhos", "Nests & beds"), W(["nido", "cucha"], ["ninho"], ["nest", "kennel"]), any(key(/nest|kennel|basket/), name(/\bnido|\bcucha|\bninho|\bnest|kennel/))),
      sub("comida", L("Comida para mascotas", "Comida para pets", "Pet food"), W(["comida", "comedero"], ["comida", "tigela"], ["food", "bowl"]),
        all(any(cat("pets"), key(/(^|_)pet/)), any(key(/food|bowl/), name(/comida|comedero|tigela|\bfood|\bbowl/)))),
      sub("juguetes", L("Juguetes", "Brinquedos", "Toys"), W(["juguete", "juguetes", "pelota"], ["brinquedo", "brinquedos", "bola"], ["toy", "toys", "ball"]),
        all(any(cat("pets"), key(/(^|_)pet/)), any(key(/toy|ball|scratch/), name(/juguete|pelota|brinquedo|\bbola\b|\btoy\b|\bball\b/)))),
    ],
  },
  {
    slug: "musica",
    label: L("Música y sonido", "Música e som", "Music & sound"),
    words: W(["musica", "sonido", "parlante", "radio"], ["musica", "som", "caixa de som"], ["music", "sound", "speaker"]),
    match: any(cat("music", "sound_fx"), key(/jukebox|song|music|(^|_)sound|speaker|piano|guitar|drum|disco|(^|_)dj|polyfon|trax/), name(/\bmusica|\bsonido|parlante|altavoz|\bpiano|guitarra|bateria|\bsom\b|caixa de som|\bmusic|\bsound|speaker|guitar|\bdrum/)),
    subs: [
      sub("sonido", L("Rockolas y sonido", "Jukebox e som", "Jukeboxes & sound"), W(["rockola", "parlante", "sonido"], ["jukebox", "som"], ["jukebox", "speaker", "sound"]),
        any(cat("sound_fx"), key(/jukebox|(^|_)sound|speaker|polyfon|trax|disco|(^|_)dj/), name(/rockola|parlante|altavoz|jukebox|caixa de som|speaker/))),
      sub("instrumentos", L("Instrumentos", "Instrumentos", "Instruments"), W(["instrumento", "piano", "guitarra"], ["instrumento", "piano", "guitarra"], ["instrument", "piano", "guitar"]),
        any(key(/piano|guitar|drum|violin|trumpet|harp|keyboard/), name(/\bpiano|guitarra|bateria|violin|trompeta|\barpa\b|guitar|\bdrum/))),
    ],
  },
  {
    slug: "teletransportes",
    label: L("Teletransportes", "Teletransportes", "Teleports"),
    words: W(["teletransporte", "teletransportes", "tele", "teles"], ["teletransporte", "teleporte", "tele"], ["teleport", "teleports", "tele"]),
    match: any(cat("teleport"), key(/teleport|(^|_)tele(_|$)|telebox/), name(/teletransport|teleport/)),
    subs: [],
  },
  {
    slug: "trofeos",
    label: L("Trofeos y premios", "Troféus e prêmios", "Trophies & prizes"),
    words: W(["trofeo", "trofeos", "premio", "premios", "medalla"], ["trofeu", "trofeus", "premio", "medalha"], ["trophy", "trophies", "prize", "medal"]),
    match: any(cat("trophy"), key(/trophy|prize|award|medal|(^|_)cup(_|$)/), name(/trofeo|\bpremio|medalla|trofeu|medalha|trophy|\bprize|award|\bmedal/)),
    subs: [],
  },
  {
    slug: "canjeables",
    label: L("Canjeables (créditos)", "Trocáveis (créditos)", "Redeemables (credits)"),
    words: W(["canjeable", "canjeables", "lingote", "lingotes", "moneda", "monedas"], ["trocavel", "trocaveis", "barra de ouro", "moeda", "moedas"], ["redeemable", "redeemables", "coin", "coins", "gold bar"]),
    match: cat("credit"),
    subs: [],
  },
  {
    slug: "ropa",
    label: L("Ropa canjeable", "Roupas resgatáveis", "Wearable clothing"),
    words: W(["ropa", "prenda", "prendas", "vestimenta"], ["roupa", "roupas"], ["clothing", "clothes", "outfit"]),
    match: any(line("clothing"), key(/^clothing_/)),
    subs: [],
  },
  {
    slug: "rares",
    label: L("Rares", "Raros", "Rares"),
    words: W(["rare", "rares", "raro", "raros", "ltd"], ["raro", "raros", "rare", "rares", "ltd"], ["rare", "rares", "ltd"]),
    match: any(line("rare", "bonusrare"), key(/^rare_|minirare|(^|_)ltd/)),
    subs: [
      sub("clasicos", L("Rares clásicos", "Raros clássicos", "Classic rares"), W(["rare clasico"], ["raro classico"], ["classic rare"]), any(line("rare"), key(/^rare_/))),
      sub("bonus", L("Bonus rares", "Bonus raros", "Bonus rares"), W(["bonus rare", "bonus"], ["bonus raro", "bonus"], ["bonus rare", "bonus"]), any(line("bonusrare"), key(/bonusrare/))),
      sub("mini", L("Mini rares", "Mini raros", "Mini rares"), W(["mini rare", "minirare"], ["mini raro"], ["mini rare", "minirare"]), key(/minirare/)),
      sub("ltd", L("LTD (edición limitada)", "LTD (edição limitada)", "LTD (limited edition)"), W(["ltd", "edicion limitada"], ["ltd", "edicao limitada"], ["ltd", "limited"]), key(/(^|_)ltd/)),
    ],
  },
  {
    slug: "temporadas",
    label: L("Fechas especiales", "Datas especiais", "Seasonal"),
    words: W(["navidad", "halloween", "pascua", "san valentin"], ["natal", "halloween", "pascoa", "namorados"], ["christmas", "xmas", "halloween", "easter", "valentine"]),
    match: key(/xmas|christmas|hween|halloween|easter|(^|_)val(_|\d|$)|valentine/),
    subs: [
      sub("navidad", L("Navidad", "Natal", "Christmas"), W(["navidad", "navideno"], ["natal", "natalino"], ["christmas", "xmas"]), key(/xmas|christmas/)),
      sub("halloween", L("Halloween", "Halloween", "Halloween"), W(["halloween"], ["halloween"], ["halloween"]), key(/hween|halloween/)),
      sub("pascua", L("Pascua", "Páscoa", "Easter"), W(["pascua"], ["pascoa"], ["easter"]), key(/easter/)),
      sub("san-valentin", L("San Valentín", "Dia dos Namorados", "Valentine's"), W(["san valentin", "enamorados"], ["namorados"], ["valentine", "valentines"]), key(/(^|_)val(_|\d|$)|valentine/)),
    ],
  },
  {
    slug: "decoracion",
    label: L("Decoración", "Decoração", "Decor"),
    words: W(["decoracion", "estatua", "estatuas", "jarron", "peluche", "peluches"], ["decoracao", "estatua", "vaso", "pelucia"], ["decor", "decoration", "statue", "vase", "plush"]),
    match: any(key(/statue|(^|_)bust|vase|plushie|teddy|ornament|sculpture|(^|_)clock|mirror|fireplace/), name(/estatua|\bbusto|jarron|peluche|\breloj|espejo|chimenea|\bvaso\b|pelucia|relogio|espelho|lareira|statue|\bvase|\bplush|\bclock|mirror|fireplace/)),
    subs: [
      sub("estatuas", L("Estatuas", "Estátuas", "Statues"), W(["estatua", "estatuas", "busto"], ["estatua", "estatuas"], ["statue", "statues", "bust"]),
        any(key(/statue|(^|_)bust|sculpture/), name(/estatua|\bbusto|escultura|statue|\bbust\b|sculpture/))),
      sub("jarrones", L("Jarrones", "Vasos", "Vases"), W(["jarron", "jarrones", "florero"], ["vaso", "vasos"], ["vase", "vases"]), any(key(/vase/), name(/jarron|florero|\bvaso\b|\bvase/))),
      sub("peluches", L("Peluches", "Pelúcias", "Plushies"), W(["peluche", "peluches"], ["pelucia", "pelucias"], ["plush", "plushie", "teddy"]), any(key(/plushie|teddy|plush/), name(/peluche|pelucia|\bplush|teddy/))),
      sub("chimeneas", L("Chimeneas", "Lareiras", "Fireplaces"), W(["chimenea", "chimeneas"], ["lareira", "lareiras"], ["fireplace", "fireplaces"]), any(key(/fireplace/), name(/chimenea|lareira|fireplace/))),
    ],
  },
  {
    slug: "colecciones",
    label: L("Colecciones", "Coleções", "Collections"),
    words: W(["coleccion", "colecciones", "linea"], ["colecao", "colecoes", "linha"], ["collection", "collections", "line"]),
    match: (i) => isCollectionLine(i.l),
    subs: [],
  },
];

/** Líneas que no son "colecciones" que la gente busque (técnicas, publicidad, pruebas o ya tienen categoría). */
const HIDDEN_LINES = /^(|nftmint|rare|bonusrare|clothing|wired|testing|test.*|ad_.*|extras|.*_test)$/;

export function isCollectionLine(l: string): boolean {
  return !HIDDEN_LINES.test(l) && /^[a-z0-9_]{2,40}$/.test(l);
}

/** "iced_dark" → "Iced Dark"; "hhistory_2024" → "Habbo History 2024". */
export function lineLabel(l: string): string {
  return l
    .replace(/^hhistory/, "habbo history")
    .replace(/^habbo_club_gifts$/, "habbo club")
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => (/^\d+$/.test(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

/** Cuántos furnis tiene que tener una línea para aparecer como subcategoría de "Colecciones". */
export const MIN_LINE_ITEMS = 15;

export function categoryBySlug(slug: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

function prepare(i: CatalogItem, otherName?: string): Item {
  return { ...i, key: i.k.toLowerCase().replace(/\*\d+$/, ""), name: normalizeText(otherName ? `${i.n} ${otherName}` : i.n) };
}

/** Furnis de prueba que Habbo deja en el catálogo: no van a ninguna categoría. */
function isTestItem(i: Item): boolean {
  return /^test/.test(i.key) || /test_?ltd/.test(i.key);
}

export interface CategoryIndex {
  /** classnames de cada categoría ("asientos") y subcategoría ("asientos/sofas", "colecciones/pura"). */
  members: Record<string, string[]>;
}

/**
 * Clasifica todo el catálogo de un hotel. `otherName` da el nombre del mismo
 * furni en otro hotel: sirve para los hoteles en alemán, francés, italiano,
 * neerlandés, finés o turco, cuyas palabras no están en las reglas de respaldo.
 */
export function buildCategoryIndex(items: CatalogItem[], otherName?: (k: string) => string | undefined): CategoryIndex {
  const members: Record<string, string[]> = {};
  const add = (path: string, k: string) => (members[path] ??= []).push(k);
  for (const raw of items) {
    const i = prepare(raw, otherName?.(raw.k));
    if (isTestItem(i)) continue;
    for (const c of CATEGORIES) {
      if (!c.match(i)) continue;
      add(c.slug, raw.k);
      for (const s of c.subs) if (s.match(i)) add(`${c.slug}/${s.slug}`, raw.k);
      if (c.slug === "colecciones") add(`colecciones/${i.l}`, raw.k);
    }
  }
  // Las líneas con muy pocos furnis no se muestran como subcategoría.
  for (const path of Object.keys(members)) {
    if (path.startsWith("colecciones/") && members[path].length < MIN_LINE_ITEMS) delete members[path];
  }
  return { members };
}

/** Subcategorías de una categoría con su cantidad (las de "Colecciones" salen de las líneas). */
export function subcategoriesOf(index: CategoryIndex, cat: CategoryDef): { slug: string; count: number }[] {
  if (cat.slug === "colecciones") {
    return Object.keys(index.members)
      .filter((p) => p.startsWith("colecciones/"))
      .map((p) => ({ slug: p.slice("colecciones/".length), count: index.members[p].length }))
      .sort((a, b) => b.count - a.count);
  }
  return cat.subs.map((s) => ({ slug: s.slug, count: index.members[`${cat.slug}/${s.slug}`]?.length ?? 0 })).filter((s) => s.count > 0);
}

export function subLabel(cat: CategoryDef, sub: string, lang: Lang): string | null {
  if (cat.slug === "colecciones") return isCollectionLine(sub) ? lineLabel(sub) : null;
  return cat.subs.find((s) => s.slug === sub)?.label[lang] ?? null;
}

export interface CategoryMatch {
  cat: string;
  sub: string | null;
  label: string;
  count: number;
}

/**
 * Categorías que coinciden con lo que alguien escribió en el buscador
 * ("pisos", "sofas", "wired"...), en cualquiera de los tres idiomas.
 */
export function matchCategories(index: CategoryIndex, query: string, lang: Lang, limit = 3): CategoryMatch[] {
  const q = normalizeText(query);
  if (q.length < 3) return [];
  const hits = (label: Labels, words: Words) => {
    const all = [...Object.values(label).map(normalizeText), ...Object.values(words).flat()];
    if (all.includes(q)) return 2;
    return q.length >= 4 && all.some((w) => w.startsWith(q)) ? 1 : 0;
  };
  const out: (CategoryMatch & { score: number })[] = [];
  for (const c of CATEGORIES) {
    const count = index.members[c.slug]?.length ?? 0;
    if (count === 0) continue;
    for (const s of c.subs) {
      const n = index.members[`${c.slug}/${s.slug}`]?.length ?? 0;
      const score = n > 0 ? hits(s.label, s.words) : 0;
      if (score) out.push({ cat: c.slug, sub: s.slug, label: s.label[lang], count: n, score: score + 0.5 });
    }
    const score = hits(c.label, c.words);
    if (score) out.push({ cat: c.slug, sub: null, label: c.label[lang], count, score });
  }
  // Las colecciones por nombre de línea ("pura", "iced").
  for (const path of Object.keys(index.members)) {
    if (!path.startsWith("colecciones/")) continue;
    const l = path.slice("colecciones/".length);
    const label = normalizeText(lineLabel(l));
    if (label === q || l === q.replace(/ /g, "_")) {
      out.push({ cat: "colecciones", sub: l, label: lineLabel(l), count: index.members[path].length, score: 2 });
    }
  }
  out.sort((a, b) => b.score - a.score || b.count - a.count);
  const seen = new Set<string>();
  return out
    .filter((m) => {
      const id = `${m.cat}/${m.sub ?? ""}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, limit)
    .map((m) => ({ cat: m.cat, sub: m.sub, label: m.label, count: m.count }));
}
