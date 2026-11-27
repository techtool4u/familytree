/**
 * Family tree of the major Hindu deities and the epic dynasties, merged with the Lord Rama tree.
 * Run: npx esbuild scripts/hindu-gods.ts --bundle --platform=node --outfile=/tmp/gods.cjs && node /tmp/gods.cjs
 * Writes data/hindu-gods-family-tree.ged (GEDCOM 5.5.1 with SOUR records) and data/hindu-gods-family-tree.json (OurFamilyTree).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import type { Person, Gender, MediaItem } from '../src/types';

const W = (page: string) => `https://en.wikipedia.org/wiki/${page}`;
const S: Record<string, { cite: string; url: string }> = {
  'W-Kashyapa': { cite: 'Wikipedia, “Kashyapa” (Vishnu Purana, Mahabharata, Ramayana lists of his wives)', url: W('Kashyapa') },
  'W-Daksha': { cite: 'Wikipedia, “Daksha” (Vishnu, Linga, Padma, Bhagavata Puranas; Mahabharata/Harivamsa)', url: W('Daksha') },
  'W-Adityas': { cite: 'Wikipedia, “Adityas” (the twelve sons of Aditi in the Mahabharata and Puranas)', url: W('Adityas') },
  'W-Diti': { cite: 'Wikipedia, “Diti” (Bhagavata Purana)', url: W('Diti') },
  'W-Prahlada': { cite: 'Wikipedia, “Prahlada” (Bhagavata Purana; Vishnu Purana 1.20)', url: W('Prahlada') },
  'W-Vinata': { cite: 'Wikipedia, “Vinata” (Mahabharata; Brahmanda Purana 16–18)', url: W('Vinata') },
  'W-Kadru': { cite: 'Wikipedia, “Kadru” (Mahabharata)', url: W('Kadru') },
  'W-Brihaspati': { cite: 'Wikipedia, “Brihaspati”', url: W('Brihaspati') },
  'W-Shukra': { cite: 'Wikipedia, “Shukra”', url: W('Shukra') },
  'W-Parvati': { cite: 'Wikipedia, “Parvati” (Puranas; Ramayana for Ganga as her sister)', url: W('Parvati') },
  'W-Ganesha': { cite: 'Wikipedia, “Ganesha” (Shiva Purana: sons Kshema/Shubha and Labha)', url: W('Ganesha') },
  'W-Kartikeya': { cite: 'Wikipedia, “Kartikeya” (Skanda Purana; Tamil tradition for Valli)', url: W('Kartikeya') },
  'W-Indra': { cite: 'Wikipedia, “Indra” (Mahabharata, Puranas; Bhagavata Purana for his children)', url: W('Indra') },
  'W-Surya': { cite: 'Wikipedia, “Surya” (Puranas; Ramayana for Sugriva; Mahabharata for Karna)', url: W('Surya') },
  'W-Hanuman': { cite: 'Wikipedia, “Hanuman” (Valmiki Ramayana: kshetraja son of Kesari, aurasa son of Vayu)', url: W('Hanuman') },
  'W-Saraswati': { cite: 'Wikipedia, “Saraswati” (consort of Brahma; daughter of Brahma in some Puranas)', url: W('Saraswati') },
  'W-Lakshmi': { cite: 'Wikipedia, “Lakshmi” (Garuda, Linga, Padma Puranas: daughter of Bhrigu & Khyati; Vishnu Purana: born from the churned ocean)', url: W('Lakshmi') },
  'W-Krishna': { cite: 'Wikipedia, “Krishna” (Bhagavata Purana, Harivamsa, Mahabharata)', url: W('Krishna') },
  'W-Chandra': { cite: 'Wikipedia, “Chandra” (Mahabharata; Puranas)', url: W('Chandra') },
  'W-Budha': { cite: 'Wikipedia, “Budha”', url: W('Budha') },
  'W-Pururavas': { cite: 'Wikipedia, “Pururavas” (Rig Veda X.95; Mahabharata; Vishnu Purana)', url: W('Pururavas') },
  'W-Yayati': { cite: 'Wikipedia, “Yayati” (Mahabharata Adi Parva; Bhagavata Purana 9.18–19; Harivamsa)', url: W('Yayati') },
  'W-Shantanu': { cite: 'Wikipedia, “Shantanu” (Mahabharata Adi Parva)', url: W('Shantanu') },
  'W-Pandu': { cite: 'Wikipedia, “Pandu” (Mahabharata Adi Parva, Sambhava Parva)', url: W('Pandu') },
  'W-Kunti': { cite: 'Wikipedia, “Kunti” (Mahabharata; Bhagavata Purana; Vana Parva 3.287–292 for Karna)', url: W('Kunti') },
  'W-Arjuna': { cite: 'Wikipedia, “Arjuna” (Mahabharata Adi Parva)', url: W('Arjuna') },
  'W-Vasudeva': { cite: 'Wikipedia, “Vasudeva” (Bhagavata, Harivamsa, Vishnu Purana)', url: W('Vasudeva') },
  'W-Pradyumna': { cite: 'Wikipedia, “Pradyumna” (Bhagavata Purana 10.55, 10.61–63)', url: W('Pradyumna') },
  'W-Dhritarashtra': { cite: 'Wikipedia, “Dhritarashtra” (Mahabharata Adi Parva)', url: W('Dhritarashtra') },
  'W-Gandhari': { cite: 'Wikipedia, “Gandhari (Mahabharata)”', url: W('Gandhari_(Mahabharata)') },
  'W-Vidura': { cite: 'Wikipedia, “Vidura” (Mahabharata, Sambhava Parva 106)', url: W('Vidura') },
  'W-Draupadeyas': { cite: 'Wikipedia, “Draupadeyas” (Mahabharata)', url: W('Draupadeyas') },
  'Puranic': { cite: 'General Puranic tradition (e.g. Bhagavata Purana, Canto 9) — not individually verified for this file', url: W('Ila_(Hinduism)') },
};

type R = [id: string, name: string, g: Gender, father: string | null, mother: string | null, src: string[], note: string, tags?: string];
const D = 'Deity', V = 'Variant', GAP = 'Lineage gap';

const rows: R[] = [
  // ---------- Creators and the Trimurti ----------
  ['vishnu', 'Vishnu', 'M', null, null, ['W-Lakshmi', 'W-Adityas'], 'The Preserver. Brahma is born from the lotus of his navel. His avatars in this tree: Vamana (son of Aditi), Rama and Krishna.', `${D},Trimurti`],
  ['lakshmi', 'Lakshmi', 'F', 'bhrigu', 'khyati', ['W-Lakshmi'], 'Goddess of fortune, consort of Vishnu. Garuda, Linga and Padma Puranas: daughter of Bhrigu and Khyati (“Bhargavi”). Vishnu Purana and Ramayana: she rose from the churned ocean of milk. Her avatars include Sita and Rukmini.', `${D},${V}`],
  ['saraswati', 'Saraswati', 'F', null, null, ['W-Saraswati'], 'Goddess of learning, consort of Brahma. Several Puranas (Brahma, Padma, Brahmanda) call her Brahma’s mind-born daughter instead; this tree records her as his consort only.', `${D},${V}`],
  ['shiva', 'Shiva', 'M', null, null, ['W-Parvati'], 'The Destroyer; self-born (Svayambhu). First wife Sati (daughter of Daksha), later Parvati, her rebirth.', `${D},Trimurti`],
  ['sati', 'Sati', 'F', 'daksha', 'prasuti', ['W-Daksha', 'W-Parvati'], 'Daughter of Daksha and Prasuti, first wife of Shiva. Reborn as Parvati.', D],

  // ---------- Brahma's mind-born sons and Daksha's daughters ----------
  ['daksha', 'Daksha', 'M', 'brahma', null, ['W-Daksha'], 'Prajapati, son of Brahma (Puranas). Wives Prasuti and Asikni. The Puranas disagree on how many daughters he had (24 or 60).', 'Prajapati'],
  ['prasuti', 'Prasuti', 'F', null, null, ['W-Daksha'], 'First wife of Daksha; mother of his 24 daughters in the Vishnu Purana list.', ''],
  ['asikni', 'Asikni (Panchajani)', 'F', null, null, ['W-Daksha'], 'Second wife of Daksha; mother of the 60 daughters, including the 13 married to Kashyapa and the 27 nakshatras married to Chandra.', ''],
  ['bhrigu', 'Bhrigu', 'M', 'brahma', null, ['W-Daksha', 'W-Shukra'], 'Mind-born son of Brahma, one of the great sages. Wives Khyati and Kavyamata.', 'Sage'],
  ['khyati', 'Khyati', 'F', 'daksha', 'prasuti', ['W-Daksha'], 'Daughter of Daksha, married to Bhrigu.', ''],
  ['kavyamata', 'Kavyamata', 'F', null, null, ['W-Shukra'], 'Wife of Bhrigu, mother of Shukra.', ''],
  ['angiras', 'Angiras', 'M', 'brahma', null, ['W-Brihaspati'], 'Mind-born son of Brahma, father of Brihaspati.', 'Sage'],
  ['atri', 'Atri', 'M', 'brahma', null, ['W-Chandra', 'W-Daksha'], 'Mind-born son of Brahma; husband of Anasuya; father of Chandra (“according to most texts”).', 'Sage'],
  ['anasuya', 'Anasuya', 'F', 'daksha', 'prasuti', ['W-Daksha', 'W-Chandra'], 'Daughter of Daksha, wife of Atri, mother of Chandra.', ''],
  ['kala', 'Kala', 'F', null, null, ['W-Kashyapa'], 'Wife of Marichi and mother of Kashyapa (Kashyapa infobox).', ''],
  ['agni', 'Agni', 'M', null, null, ['W-Daksha'], 'God of fire; husband of Svaha.', D],
  ['svaha', 'Svaha', 'F', 'daksha', 'prasuti', ['W-Daksha'], 'Daughter of Daksha, wife of Agni.', D],

  // ---------- Kashyapa's wives (daughters of Daksha) ----------
  ['aditi', 'Aditi', 'F', 'daksha', 'asikni', ['W-Daksha', 'W-Adityas'], 'Mother of the gods: the twelve Adityas. Daughter of Daksha, wife of Kashyapa.', D],
  ['diti', 'Diti', 'F', 'daksha', 'asikni', ['W-Diti'], 'Mother of the Daityas (asuras). The Maruts were born when Indra split her unborn child.', ''],
  ['danu', 'Danu', 'F', 'daksha', 'asikni', ['W-Daksha'], 'Mother of the Danavas.', ''],
  ['vinata', 'Vinata', 'F', 'daksha', 'asikni', ['W-Vinata'], 'Mother of Aruna and Garuda (Mahabharata), and of Sumati (Brahmanda Purana).', ''],
  ['kadru', 'Kadru', 'F', 'daksha', 'asikni', ['W-Kadru'], 'Mother of the thousand Nagas (Mahabharata). The Valmiki Ramayana instead makes her a granddaughter of Daksha.', V],

  // ---------- The Adityas ----------
  ['indra', 'Indra (Shakra)', 'M', 'kashyapa', 'aditi', ['W-Adityas', 'W-Indra'], 'King of the gods. Puranic parents Kashyapa and Aditi (Vedic texts differ). Wife Shachi. Spiritual father of Vali and Arjuna.', `${D},Aditya`],
  ['vamana', 'Vamana', 'M', 'kashyapa', 'aditi', ['W-Adityas'], 'Dwarf avatar of Vishnu, born as the youngest Aditya; humbled the asura king Bali.', `${D},Aditya,Avatar of Vishnu`],
  ['varuna', 'Varuna', 'M', 'kashyapa', 'aditi', ['W-Adityas'], 'Aditya; god of the waters.', `${D},Aditya`],
  ['mitra', 'Mitra', 'M', 'kashyapa', 'aditi', ['W-Adityas'], 'Aditya.', `${D},Aditya`],
  ['aryaman', 'Aryaman', 'M', 'kashyapa', 'aditi', ['W-Adityas'], 'Aditya.', `${D},Aditya`],
  ['tvashtr', 'Tvashtr', 'M', 'kashyapa', 'aditi', ['W-Adityas', 'W-Surya'], 'Aditya and divine craftsman; father of Saranyu (Surya’s wife).', `${D},Aditya`],
  ['savitr', 'Savitr', 'M', 'kashyapa', 'aditi', ['W-Adityas'], 'Aditya.', `${D},Aditya`],
  ['bhaga', 'Bhaga', 'M', 'kashyapa', 'aditi', ['W-Adityas'], 'Aditya.', `${D},Aditya`],
  ['dhatr', 'Dhatr', 'M', 'kashyapa', 'aditi', ['W-Adityas'], 'Aditya.', `${D},Aditya`],
  ['amsha', 'Amsha', 'M', 'kashyapa', 'aditi', ['W-Adityas'], 'Aditya.', `${D},Aditya`],
  ['pushan', 'Pushan', 'M', 'kashyapa', 'aditi', ['W-Adityas'], 'Aditya.', `${D},Aditya`],

  // ---------- Surya's household ----------
  ['saranyu', 'Saranyu (Sanjna)', 'F', 'tvashtr', null, ['W-Surya'], 'Daughter of Tvashtr, wife of Surya; mother of Vaivasvata Manu, Yama, Yami and the Ashvins.', D],
  ['chhaya', 'Chhaya', 'F', null, null, ['W-Surya'], 'The “shadow” of Saranyu and Surya’s second wife; mother of Shani, Tapati and Savarni Manu.', D],
  ['yama', 'Yama (Dharma)', 'M', 'vivasvan', 'saranyu', ['W-Surya', 'W-Pandu'], 'God of death and dharma; first mortal to die. Divine father of Yudhishthira (Mahabharata).', D],
  ['yami', 'Yami (Yamuna)', 'F', 'vivasvan', 'saranyu', ['W-Surya'], 'Twin sister of Yama; the river Yamuna.', D],
  ['nasatya', 'Nasatya (Ashvin)', 'M', 'vivasvan', 'saranyu', ['W-Surya', 'W-Pandu'], 'One of the twin Ashvins, physicians of the gods. Divine father of Nakula (Mahabharata).', D],
  ['dasra', 'Dasra (Ashvin)', 'M', 'vivasvan', 'saranyu', ['W-Surya', 'W-Pandu'], 'One of the twin Ashvins. Divine father of Sahadeva (Mahabharata).', D],
  ['shani', 'Shani', 'M', 'vivasvan', 'chhaya', ['W-Surya'], 'Saturn; son of Surya and Chhaya.', D],
  ['tapati', 'Tapati', 'F', 'vivasvan', 'chhaya', ['W-Surya'], 'Daughter of Surya and Chhaya; the river Tapti.', D],
  ['savarni', 'Savarni Manu', 'M', 'vivasvan', 'chhaya', ['W-Surya'], 'The eighth Manu; son of Surya and Chhaya.', D],
  ['revanta', 'Revanta', 'M', 'vivasvan', null, ['W-Surya'], 'Son of Surya; his mother varies by text.', D],
  ['sugriva', 'Sugriva', 'M', 'vivasvan', null, ['W-Surya'], 'Vanara king of Kishkindha, Rama’s ally; son of Surya (Ramayana).', 'Vanara'],
  ['karna', 'Karna', 'M', 'vivasvan', 'kunti', ['W-Surya', 'W-Kunti'], 'Son of Surya and Kunti, born before her marriage (Mahabharata, Vana Parva 3.287–292). Raised by a charioteer family.', 'Mahabharata'],

  // ---------- Indra's household ----------
  ['puloman', 'Puloman', 'M', null, null, ['W-Indra'], 'A Danava chief; father of Shachi.', 'Danava'],
  ['shachi', 'Shachi (Indrani)', 'F', 'puloman', null, ['W-Indra'], 'Wife of Indra, daughter of the Danava Puloman. “Most texts state that Indra had only one wife.”', D],
  ['jayanta', 'Jayanta', 'M', 'indra', 'shachi', ['W-Indra'], 'Son of Indra (Bhagavata Purana).', D],
  ['jayanti', 'Jayanti', 'F', 'indra', 'shachi', ['W-Indra', 'W-Shukra'], 'Daughter of Indra, married to Shukra (Bhagavata Purana).', D],
  ['devasena', 'Devasena', 'F', 'indra', 'shachi', ['W-Kartikeya', 'W-Indra'], 'Wife of Kartikeya. Skanda Purana: daughter of Indra and Shachi; Mahabharata: daughter of Daksha.', `${D},${V}`],
  ['vali', 'Vali', 'M', 'indra', null, ['W-Indra'], 'Vanara king, elder brother of Sugriva; son of Indra (Ramayana).', 'Vanara'],

  // ---------- Shiva and Parvati ----------
  ['himavan', 'Himavan', 'M', null, null, ['W-Parvati'], 'King of the Himalayas; father of Parvati and Ganga.', 'Mountain king'],
  ['mena', 'Mena', 'F', null, null, ['W-Parvati'], 'Queen of Himavan; mother of Parvati.', ''],
  ['parvati', 'Parvati', 'F', 'himavan', 'mena', ['W-Parvati'], 'Consort of Shiva, rebirth of Sati. Mother of Kartikeya and Ganesha.', D],
  ['ganga', 'Ganga', 'F', 'himavan', 'mena', ['W-Parvati', 'W-Shantanu'], 'River goddess; elder sister of Parvati (Ramayana). Wife of King Shantanu and mother of Bhishma (Mahabharata).', D],
  ['mainaka', 'Mainaka', 'M', 'himavan', 'mena', ['W-Parvati'], 'Mountain; brother of Parvati.', 'Mountain'],
  ['kartikeya', 'Kartikeya (Skanda, Murugan)', 'M', 'shiva', 'parvati', ['W-Kartikeya'], 'God of war, son of Shiva and Parvati. Other accounts: son of Agni and Svaha (Vana Parva). Celibate in North/East Indian tradition; married to Devasena and Valli in the South.', `${D},${V}`],
  ['valli', 'Valli', 'F', null, null, ['W-Kartikeya'], 'Second wife of Murugan in Tamil tradition, daughter of a tribal chief.', D],
  ['ganesha', 'Ganesha', 'M', 'shiva', 'parvati', ['W-Ganesha'], 'Remover of obstacles, son of Shiva and Parvati. Consorts Riddhi and Siddhi in the mainstream pattern; celibate in South Indian tradition.', `${D},${V}`],
  ['riddhi', 'Riddhi', 'F', null, null, ['W-Ganesha'], 'Consort of Ganesha (prosperity).', D],
  ['siddhi', 'Siddhi', 'F', null, null, ['W-Ganesha'], 'Consort of Ganesha (spiritual power).', D],
  ['shubha', 'Shubha (Kshema)', 'M', 'ganesha', 'siddhi', ['W-Ganesha'], 'Son of Ganesha. The Shiva Purana names him Kshema. Which consort bore which son varies.', `${D},${V}`],
  ['labha', 'Labha', 'M', 'ganesha', 'riddhi', ['W-Ganesha'], 'Son of Ganesha (profit).', `${D},${V}`],
  ['ashokasundari', 'Ashokasundari', 'F', 'shiva', 'parvati', ['W-Kartikeya', 'W-Yayati'], 'Daughter of Parvati in the Padma Purana. Some traditions make her the wife of King Nahusha and mother of Yayati (the Harivamsa names Nahusha’s wife Viraja instead).', `${D},${V}`],

  // ---------- Bhrigu and Angiras lines ----------
  ['shukra', 'Shukra (Ushanas)', 'M', 'bhrigu', 'kavyamata', ['W-Shukra'], 'Preceptor of the asuras; son (or grandson) of Bhrigu.', 'Sage'],
  ['devayani', 'Devayani', 'F', 'shukra', null, ['W-Shukra', 'W-Yayati'], 'Daughter of Shukra, wife of Yayati. Mother given as Urjasvati or Jayanti depending on the text, so left blank.', ''],
  ['brihaspati', 'Brihaspati', 'M', 'angiras', null, ['W-Brihaspati'], 'Preceptor of the gods; son of Angiras. Wife Tara.', 'Sage'],
  ['tara', 'Tara', 'F', null, null, ['W-Brihaspati', 'W-Chandra'], 'Wife of Brihaspati; abducted by Chandra, she bore Budha.', ''],
  ['kacha', 'Kacha', 'M', 'brihaspati', 'tara', ['W-Brihaspati'], 'Son of Brihaspati; studied under Shukra and was loved by Devayani.', ''],

  // ---------- Daityas (Diti's line) ----------
  ['hiranyakashipu', 'Hiranyakashipu', 'M', 'kashyapa', 'diti', ['W-Diti', 'W-Prahlada'], 'Asura king, twin of Hiranyaksha; slain by Narasimha.', 'Daitya'],
  ['hiranyaksha', 'Hiranyaksha', 'M', 'kashyapa', 'diti', ['W-Diti'], 'Twin of Hiranyakashipu; slain by Varaha.', 'Daitya'],
  ['simhika', 'Simhika', 'F', 'kashyapa', 'diti', ['W-Diti', 'W-Vinata'], 'Daughter of Diti (Diti page); the Vinata page makes her Vinata’s sister instead.', `Daitya,${V}`],
  ['kayadhu', 'Kayadhu', 'F', null, null, ['W-Prahlada'], 'Wife of Hiranyakashipu, mother of Prahlada.', ''],
  ['prahlada', 'Prahlada', 'M', 'hiranyakashipu', 'kayadhu', ['W-Prahlada'], 'Devotee of Vishnu, saved by Narasimha.', 'Daitya'],
  ['virochana', 'Virochana', 'M', 'prahlada', null, ['W-Prahlada'], 'Son of Prahlada, father of Bali.', 'Daitya'],
  ['bali', 'Bali (Mahabali)', 'M', 'virochana', null, ['W-Prahlada'], 'Generous asura king humbled by Vamana; celebrated at Onam.', 'Daitya'],
  ['banasura', 'Banasura', 'M', 'bali', null, ['W-Prahlada', 'W-Pradyumna'], 'Asura king, great-grandson of Prahlada; father of Usha. Defeated by Krishna.', 'Daitya'],
  ['usha', 'Usha', 'F', 'banasura', null, ['W-Pradyumna'], 'Daughter of Bana; married Aniruddha, Krishna’s grandson (Bhagavata 10.62–63).', ''],

  // ---------- Vinata's and Kadru's children ----------
  ['aruna', 'Aruna', 'M', 'kashyapa', 'vinata', ['W-Vinata'], 'Elder son of Vinata; charioteer of Surya.', D],
  ['garuda', 'Garuda', 'M', 'kashyapa', 'vinata', ['W-Vinata'], 'King of birds and mount of Vishnu.', D],
  ['shesha', 'Shesha (Ananta)', 'M', 'kashyapa', 'kadru', ['W-Kadru'], 'Eldest Naga; the serpent on whom Vishnu rests. Lakshmana and Balarama are considered his incarnations.', 'Naga'],
  ['vasuki', 'Vasuki', 'M', 'kashyapa', 'kadru', ['W-Kadru'], 'Naga king; the rope used to churn the ocean.', 'Naga'],
  ['takshaka', 'Takshaka', 'M', 'kashyapa', 'kadru', ['W-Kadru'], 'Naga king who killed King Parikshit.', 'Naga'],

  // ---------- Hanuman ----------
  ['vayu', 'Vayu', 'M', null, null, ['W-Hanuman', 'W-Pandu'], 'God of wind. Biological (aurasa) father of Hanuman in the Valmiki Ramayana; divine father of Bhima in the Mahabharata.', D],
  ['kesari', 'Kesari', 'M', null, null, ['W-Hanuman'], 'Vanara chief; Hanuman’s father by marriage (kshetraja).', 'Vanara'],
  ['anjana', 'Anjana', 'F', null, null, ['W-Hanuman'], 'Mother of Hanuman, wife of Kesari.', 'Vanara'],
  ['hanuman', 'Hanuman', 'M', 'vayu', 'anjana', ['W-Hanuman'], 'Devotee and messenger of Rama. Valmiki: aurasa son of Vayu and kshetraja son of Kesari. Shaiva tradition sees him as an avatar of Shiva. Traditionally celibate.', `${D},Vanara`],

  // ---------- Lunar dynasty ----------
  ['chandra', 'Chandra (Soma)', 'M', 'atri', 'anasuya', ['W-Chandra'], 'Moon god, founder of the Lunar dynasty. Married the 27 nakshatra daughters of Daksha, Rohini his favourite.', D],
  ['rohini', 'Rohini', 'F', 'daksha', 'asikni', ['W-Daksha', 'W-Chandra'], 'Daughter of Daksha; chief wife of Chandra.', 'Nakshatra'],
  ['budha', 'Budha', 'M', 'chandra', 'tara', ['W-Budha', 'W-Chandra'], 'Mercury; son of Chandra by Tara (some sources: by Rohini). Husband of Ila.', `${D},${V}`],
  ['ila', 'Ila', 'F', 'manu', null, ['W-Budha', 'W-Pururavas', 'Puranic'], 'Child of Vaivasvata Manu who changed sex between male (Sudyumna) and female; as Ila, bore Pururavas to Budha. This links the Lunar dynasty to the Solar one.', V],
  ['pururavas', 'Pururavas', 'M', 'budha', 'ila', ['W-Pururavas'], 'First king of the Lunar dynasty (Rig Veda X.95; Vishnu Purana). Married the apsara Urvashi.', 'Lunar dynasty,King'],
  ['urvashi', 'Urvashi', 'F', null, null, ['W-Pururavas'], 'Apsara, wife of Pururavas.', 'Apsara'],
  ['ayu', 'Ayu', 'M', 'pururavas', 'urvashi', ['W-Pururavas'], 'Eldest son of Pururavas; father of Nahusha.', 'Lunar dynasty,King'],
  ['nahusha_l', 'Nahusha (Lunar dynasty)', 'M', 'ayu', null, ['W-Pururavas', 'W-Yayati'], 'Son of Ayu; briefly ruled heaven in Indra’s place. Not the same as Nahusha of the Ikshvaku line.', 'Lunar dynasty,King'],
  ['yayati_l', 'Yayati (Lunar dynasty)', 'M', 'nahusha_l', null, ['W-Yayati'], 'Son of Nahusha. Married Devayani and Sharmishtha; his five sons founded the Yadava, Paurava and other lines. Mother: Viraja (Harivamsa) or Ashokasundari (Padma Purana).', 'Lunar dynasty,King'],
  ['vrishaparvan', 'Vrishaparvan', 'M', null, null, ['W-Yayati'], 'King of the Danavas; father of Sharmishtha.', 'Danava'],
  ['sharmishtha', 'Sharmishtha', 'F', 'vrishaparvan', null, ['W-Yayati'], 'Daughter of Vrishaparvan; wife of Yayati.', ''],
  ['yadu', 'Yadu', 'M', 'yayati_l', 'devayani', ['W-Yayati'], 'Eldest son of Yayati and Devayani; ancestor of the Yadavas (Krishna’s clan).', 'Lunar dynasty,Yadava'],
  ['turvasu', 'Turvasu', 'M', 'yayati_l', 'devayani', ['W-Yayati'], 'Son of Yayati and Devayani.', 'Lunar dynasty'],
  ['druhyu', 'Druhyu', 'M', 'yayati_l', 'sharmishtha', ['W-Yayati'], 'Son of Yayati and Sharmishtha.', 'Lunar dynasty'],
  ['anu', 'Anu', 'M', 'yayati_l', 'sharmishtha', ['W-Yayati'], 'Son of Yayati and Sharmishtha.', 'Lunar dynasty'],
  ['puru', 'Puru', 'M', 'yayati_l', 'sharmishtha', ['W-Yayati'], 'Youngest son of Yayati, who took on his father’s old age; ancestor of the Pauravas and the Kuru dynasty.', 'Lunar dynasty,Kuru dynasty'],

  // ---------- Yadavas: Krishna ----------
  ['gap_yadava', '··· Yadava kings ···', 'U', 'yadu', null, ['W-Vasudeva'], 'LINEAGE GAP: many generations of Yadava kings between Yadu and Shurasena are not listed in this file (see Bhagavata Purana Canto 9, Harivamsa).', GAP],
  ['shurasena', 'Shurasena', 'M', 'gap_yadava', null, ['W-Vasudeva', 'W-Kunti'], 'Yadava king; father of Vasudeva and Kunti.', 'Yadava,King'],
  ['marisha', 'Marisha', 'F', null, null, ['W-Vasudeva', 'W-Kunti'], 'Wife of Shurasena (Bhagavata Purana).', ''],
  ['vasudeva', 'Vasudeva', 'M', 'shurasena', 'marisha', ['W-Vasudeva'], 'Father of Krishna and Balarama.', 'Yadava'],
  ['devaki', 'Devaki', 'F', null, null, ['W-Vasudeva', 'W-Krishna'], 'Mother of Krishna; sister (cousin) of Kamsa, who killed six of her sons.', 'Yadava'],
  ['rohini_v', 'Rohini (wife of Vasudeva)', 'F', null, null, ['W-Vasudeva'], 'Wife of Vasudeva; Balarama was transferred to her womb from Devaki’s. Not the nakshatra Rohini.', 'Yadava'],
  ['krishna', 'Krishna', 'M', 'vasudeva', 'devaki', ['W-Krishna', 'W-Vasudeva'], 'Eighth avatar of Vishnu. Born to Devaki and Vasudeva, raised by Nanda and Yashoda in Gokul. Bhagavata Purana names eight principal queens.', `${D},Avatar of Vishnu,Yadava`],
  ['balarama', 'Balarama', 'M', 'vasudeva', 'rohini_v', ['W-Vasudeva', 'W-Krishna'], 'Elder brother of Krishna; conceived by Devaki and transferred to Rohini’s womb.', `${D},Yadava`],
  ['subhadra', 'Subhadra', 'F', 'vasudeva', 'rohini_v', ['W-Vasudeva', 'W-Arjuna'], 'Sister of Krishna and Balarama; wife of Arjuna, mother of Abhimanyu.', 'Yadava'],
  ['kunti', 'Kunti (Pritha)', 'F', 'shurasena', 'marisha', ['W-Kunti'], 'Born Pritha, daughter of Shurasena, adopted by King Kuntibhoja. Sister of Vasudeva (so Krishna’s aunt). Wife of Pandu; mother of Karna, Yudhishthira, Bhima and Arjuna.', 'Mahabharata,Adopted'],
  ['rukmini', 'Rukmini', 'F', null, null, ['W-Krishna', 'W-Lakshmi'], 'Chief queen of Krishna, considered an avatar of Lakshmi.', 'Queen'],
  ['satyabhama', 'Satyabhama', 'F', null, null, ['W-Krishna'], 'Queen of Krishna.', 'Queen'],
  ['jambavati', 'Jambavati', 'F', null, null, ['W-Krishna'], 'Queen of Krishna; mother of Samba.', 'Queen'],
  ['pradyumna', 'Pradyumna', 'M', 'krishna', 'rukmini', ['W-Pradyumna'], 'Son of Krishna and Rukmini; incarnation of Kamadeva (Bhagavata).', 'Yadava'],
  ['rukmavati', 'Rukmavati', 'F', null, null, ['W-Pradyumna'], 'Wife of Pradyumna, daughter of Rukmi; mother of Aniruddha. (Pradyumna also married Mayavati and Prabhavati.)', ''],
  ['aniruddha', 'Aniruddha', 'M', 'pradyumna', 'rukmavati', ['W-Pradyumna'], 'Grandson of Krishna; married Usha, daughter of Banasura (Bhagavata 10.61–63).', 'Yadava'],
  ['samba', 'Samba', 'M', 'krishna', 'jambavati', ['W-Krishna'], 'Son of Krishna and Jambavati.', 'Yadava'],

  // ---------- Pauravas and the Kuru dynasty ----------
  ['gap_paurava1', '··· Paurava kings ···', 'U', 'puru', null, ['W-Shantanu'], 'LINEAGE GAP: generations between Puru and Dushyanta are omitted (Mahabharata Adi Parva 94–95).', GAP],
  ['dushyanta', 'Dushyanta', 'M', 'gap_paurava1', null, ['W-Shantanu'], 'Paurava king, husband of Shakuntala (Mahabharata Adi Parva; Kalidasa’s Abhijnanashakuntalam).', 'Kuru dynasty,King'],
  ['shakuntala', 'Shakuntala', 'F', null, null, ['W-Shantanu'], 'Wife of Dushyanta, mother of Bharata; daughter of Vishvamitra and the apsara Menaka.', ''],
  ['bharata_k', 'Bharata (son of Dushyanta)', 'M', 'dushyanta', 'shakuntala', ['W-Shantanu'], 'Emperor after whom Bharata (India) is named. Not Rama’s brother.', 'Kuru dynasty,King'],
  ['gap_paurava2', '··· Bharata’s descendants ···', 'U', 'bharata_k', null, ['W-Shantanu'], 'LINEAGE GAP: generations from Bharata to Kuru (including Hastin, founder of Hastinapura) are omitted.', GAP],
  ['kuru', 'Kuru', 'M', 'gap_paurava2', null, ['W-Shantanu'], 'King after whom the Kuru dynasty and Kurukshetra are named.', 'Kuru dynasty,King'],
  ['gap_kuru', '··· Kuru kings ···', 'U', 'kuru', null, ['W-Shantanu'], 'LINEAGE GAP: generations from Kuru to Pratipa are omitted.', GAP],
  ['pratipa', 'Pratipa', 'M', 'gap_kuru', null, ['W-Shantanu'], 'King of Hastinapura; father of Shantanu.', 'Kuru dynasty,King'],
  ['sunanda', 'Sunanda', 'F', null, null, ['W-Shantanu'], 'Wife of Pratipa, mother of Shantanu.', ''],
  ['shantanu', 'Shantanu', 'M', 'pratipa', 'sunanda', ['W-Shantanu'], 'King of Hastinapura. Wives Ganga (mother of Bhishma) and Satyavati.', 'Kuru dynasty,King'],
  ['bhishma', 'Bhishma (Devavrata)', 'M', 'shantanu', 'ganga', ['W-Shantanu'], 'Son of Shantanu and Ganga; took a vow of lifelong celibacy. (Ganga’s seven elder sons, the Vasus, were drowned at birth.)', 'Kuru dynasty'],
  ['satyavati', 'Satyavati', 'F', null, null, ['W-Shantanu'], 'Wife of Shantanu; earlier bore Vyasa to the sage Parashara.', ''],
  ['parashara', 'Parashara', 'M', null, null, ['W-Pandu'], 'Sage; father of Vyasa by Satyavati.', 'Sage'],
  ['vyasa', 'Vyasa', 'M', 'parashara', 'satyavati', ['W-Pandu', 'W-Dhritarashtra'], 'Compiler of the Vedas and author of the Mahabharata. By niyoga, biological father of Dhritarashtra, Pandu and Vidura.', 'Sage'],
  ['chitrangada', 'Chitrangada', 'M', 'shantanu', 'satyavati', ['W-Shantanu'], 'Elder son of Shantanu and Satyavati; died young.', 'Kuru dynasty'],
  ['vichitravirya', 'Vichitravirya', 'M', 'shantanu', 'satyavati', ['W-Shantanu'], 'Younger son of Shantanu; legal father of Dhritarashtra and Pandu. Died childless.', 'Kuru dynasty,King'],
  ['ambika', 'Ambika', 'F', null, null, ['W-Dhritarashtra'], 'Widow of Vichitravirya; mother of Dhritarashtra.', ''],
  ['ambalika', 'Ambalika', 'F', null, null, ['W-Pandu'], 'Widow of Vichitravirya; mother of Pandu.', ''],
  ['parishrami', 'Parishrami', 'F', null, null, ['W-Vidura'], 'Maid of the queens; mother of Vidura.', ''],
  ['dhritarashtra', 'Dhritarashtra', 'M', 'vyasa', 'ambika', ['W-Dhritarashtra'], 'Blind king of Hastinapura. Biological son of Vyasa (niyoga); legal son of Vichitravirya.', 'Kuru dynasty,King'],
  ['pandu', 'Pandu', 'M', 'vyasa', 'ambalika', ['W-Pandu'], 'Biological son of Vyasa (niyoga); legal son of Vichitravirya. Wives Kunti and Madri.', 'Kuru dynasty,King'],
  ['vidura', 'Vidura', 'M', 'vyasa', 'parishrami', ['W-Vidura'], 'Wise minister; son of Vyasa and the maid Parishrami. Said to be an incarnation of Yama (Dharma).', 'Kuru dynasty'],
  ['gandhari', 'Gandhari', 'F', 'subala', null, ['W-Gandhari'], 'Princess of Gandhara, wife of Dhritarashtra, mother of the hundred Kauravas and Dushala.', ''],
  ['subala', 'Subala', 'M', null, null, ['W-Gandhari'], 'King of Gandhara.', 'King'],
  ['shakuni', 'Shakuni', 'M', 'subala', null, ['W-Gandhari'], 'Brother of Gandhari.', ''],
  ['duryodhana', 'Duryodhana', 'M', 'dhritarashtra', 'gandhari', ['W-Dhritarashtra'], 'Eldest Kaurava.', 'Kuru dynasty,Kaurava'],
  ['dushasana', 'Dushasana', 'M', 'dhritarashtra', 'gandhari', ['W-Dhritarashtra'], 'Second Kaurava.', 'Kuru dynasty,Kaurava'],
  ['dushala', 'Dushala', 'F', 'dhritarashtra', 'gandhari', ['W-Dhritarashtra', 'W-Gandhari'], 'Only daughter of Dhritarashtra and Gandhari.', 'Kuru dynasty'],
  ['madri', 'Madri', 'F', null, null, ['W-Pandu'], 'Second wife of Pandu; mother of Nakula and Sahadeva.', ''],
  ['yudhishthira', 'Yudhishthira', 'M', 'pandu', 'kunti', ['W-Pandu'], 'Eldest Pandava. Divine father: Yama (Dharma). Pandu is his legal father.', 'Kuru dynasty,Pandava'],
  ['bhima', 'Bhima', 'M', 'pandu', 'kunti', ['W-Pandu', 'W-Hanuman'], 'Second Pandava. Divine father: Vayu, which makes him Hanuman’s half-brother (Mahabharata).', 'Kuru dynasty,Pandava'],
  ['arjuna', 'Arjuna', 'M', 'pandu', 'kunti', ['W-Pandu', 'W-Arjuna'], 'Third Pandava; divine father Indra. Wives Draupadi, Ulupi, Chitrangada and Subhadra. Recipient of the Bhagavad Gita.', 'Kuru dynasty,Pandava'],
  ['nakula', 'Nakula', 'M', 'pandu', 'madri', ['W-Pandu'], 'Fourth Pandava; divine father the Ashvin Nasatya.', 'Kuru dynasty,Pandava'],
  ['sahadeva', 'Sahadeva', 'M', 'pandu', 'madri', ['W-Pandu'], 'Fifth Pandava; divine father the Ashvin Dasra.', 'Kuru dynasty,Pandava'],
  ['draupadi', 'Draupadi', 'F', null, null, ['W-Arjuna', 'W-Draupadeyas'], 'Princess of Panchala, wife of all five Pandavas; regarded as a form of Sri (Lakshmi) in the Mahabharata.', ''],
  ['prativindhya', 'Prativindhya', 'M', 'yudhishthira', 'draupadi', ['W-Draupadeyas'], 'Son of Yudhishthira and Draupadi.', 'Kuru dynasty'],
  ['sutasoma', 'Sutasoma', 'M', 'bhima', 'draupadi', ['W-Draupadeyas'], 'Son of Bhima and Draupadi.', 'Kuru dynasty'],
  ['shrutakarma', 'Shrutakarma', 'M', 'arjuna', 'draupadi', ['W-Draupadeyas'], 'Son of Arjuna and Draupadi.', 'Kuru dynasty'],
  ['shatanika', 'Shatanika', 'M', 'nakula', 'draupadi', ['W-Draupadeyas'], 'Son of Nakula and Draupadi.', 'Kuru dynasty'],
  ['shrutasena', 'Shrutasena', 'M', 'sahadeva', 'draupadi', ['W-Draupadeyas'], 'Son of Sahadeva and Draupadi.', 'Kuru dynasty'],
  ['ulupi', 'Ulupi', 'F', null, null, ['W-Arjuna'], 'Naga princess, wife of Arjuna.', 'Naga'],
  ['chitrangada_m', 'Chitrangada (of Manipura)', 'F', null, null, ['W-Arjuna'], 'Princess of Manipura, wife of Arjuna. Not the Kuru prince Chitrangada.', ''],
  ['iravan', 'Iravan', 'M', 'arjuna', 'ulupi', ['W-Arjuna'], 'Son of Arjuna and Ulupi.', 'Kuru dynasty'],
  ['babruvahana', 'Babruvahana', 'M', 'arjuna', 'chitrangada_m', ['W-Arjuna'], 'Son of Arjuna and Chitrangada; king of Manipura.', ''],
  ['abhimanyu', 'Abhimanyu', 'M', 'arjuna', 'subhadra', ['W-Arjuna', 'W-Chandra'], 'Son of Arjuna and Subhadra; killed in the Chakravyuha. Said to be Chandra’s son Varchas reborn.', 'Kuru dynasty'],
  ['uttara', 'Uttara', 'F', null, null, ['W-Arjuna'], 'Princess of Matsya, wife of Abhimanyu.', ''],
  ['parikshit', 'Parikshit', 'M', 'abhimanyu', 'uttara', ['W-Arjuna'], 'Grandson of Arjuna; continued the Kuru line. Killed by the Naga Takshaka.', 'Kuru dynasty,King'],
  ['janamejaya', 'Janamejaya', 'M', 'parikshit', null, ['W-Arjuna'], 'Son of Parikshit; the Mahabharata was first recited at his snake sacrifice.', 'Kuru dynasty,King'],
];

const marriages: [string, string][] = [
  ['vishnu', 'lakshmi'], ['brahma', 'saraswati'], ['shiva', 'sati'], ['shiva', 'parvati'],
  ['daksha', 'prasuti'], ['daksha', 'asikni'], ['bhrigu', 'khyati'], ['bhrigu', 'kavyamata'], ['atri', 'anasuya'], ['marichi', 'kala'], ['agni', 'svaha'],
  ['kashyapa', 'aditi'], ['kashyapa', 'diti'], ['kashyapa', 'danu'], ['kashyapa', 'vinata'], ['kashyapa', 'kadru'],
  ['vivasvan', 'saranyu'], ['vivasvan', 'chhaya'], ['indra', 'shachi'], ['himavan', 'mena'],
  ['kartikeya', 'devasena'], ['kartikeya', 'valli'], ['ganesha', 'riddhi'], ['ganesha', 'siddhi'],
  ['nahusha_l', 'ashokasundari'], ['shukra', 'jayanti'], ['brihaspati', 'tara'], ['hiranyakashipu', 'kayadhu'],
  ['kesari', 'anjana'], ['chandra', 'rohini'], ['budha', 'ila'], ['pururavas', 'urvashi'],
  ['yayati_l', 'devayani'], ['yayati_l', 'sharmishtha'], ['shurasena', 'marisha'], ['vasudeva', 'devaki'], ['vasudeva', 'rohini_v'],
  ['krishna', 'rukmini'], ['krishna', 'satyabhama'], ['krishna', 'jambavati'], ['pradyumna', 'rukmavati'], ['aniruddha', 'usha'],
  ['dushyanta', 'shakuntala'], ['pratipa', 'sunanda'], ['shantanu', 'ganga'], ['shantanu', 'satyavati'],
  ['vichitravirya', 'ambika'], ['vichitravirya', 'ambalika'], ['dhritarashtra', 'gandhari'], ['pandu', 'kunti'], ['pandu', 'madri'],
  ['yudhishthira', 'draupadi'], ['bhima', 'draupadi'], ['arjuna', 'draupadi'], ['nakula', 'draupadi'], ['sahadeva', 'draupadi'],
  ['arjuna', 'ulupi'], ['arjuna', 'chitrangada_m'], ['arjuna', 'subhadra'], ['abhimanyu', 'uttara'],
];

// ---------- merge with the Lord Rama tree ----------
const rama = JSON.parse(readFileSync('data/rama-family-tree.json', 'utf8')) as { people: Person[]; sources: Record<string, { cite: string; url: string }> };
Object.assign(S, rama.sources);
const people = new Map<string, Person>(rama.people.map((p) => [p.id, structuredClone(p)]));

for (const [id, name, g, f, m, src, note, tags] of rows) {
  if (people.has(id)) throw new Error('duplicate id ' + id);
  const media: MediaItem[] = src.map((k, i) => ({ id: `${id}-src${i}`, kind: 'document', title: S[k].cite, note: S[k].url }));
  people.set(id, {
    id, given: name, surname: '', gender: g, fatherId: f ?? undefined, motherId: m ?? undefined, spouseIds: [],
    bio: `${note}\n\nSources: ${src.map((k) => S[k].cite).join('; ')}.`, tags: (tags ?? '').split(',').filter(Boolean), events: [], media,
  });
}
// connections into the Rama tree
const patch = (id: string, fn: (p: Person) => void, src: string, note: string) => {
  const p = people.get(id)!; fn(p);
  p.bio = (p.bio ?? '') + `\n${note}`;
  p.media.push({ id: `${id}-xsrc`, kind: 'document', title: S[src].cite, note: S[src].url });
};
patch('vivasvan', (p) => { p.motherId = 'aditi'; p.tags.push('Aditya'); }, 'W-Adityas', 'Mother: Aditi — he is one of the twelve Adityas (Mahabharata, Puranas).');
patch('sumati_s', (p) => { p.fatherId = 'kashyapa'; p.motherId = 'vinata'; }, 'W-Vinata', 'Daughter of Vinata and Kashyapa (Arishtanemi), sister of Garuda (Brahmanda Purana).');
patch('rama', (p) => { p.tags.push('Deity'); }, 'W-Hanuman', 'Avatar of Vishnu; Hanuman was his devotee.');
patch('sita', () => {}, 'W-Lakshmi', 'Considered an avatar of Lakshmi.');

for (const [a, b] of marriages) {
  const A = people.get(a), B = people.get(b);
  if (!A || !B) throw new Error(`marriage ${a}–${b}: missing person`);
  if (!A.spouseIds.includes(b)) A.spouseIds.push(b);
  if (!B.spouseIds.includes(a)) B.spouseIds.push(a);
}
// integrity: refs exist, no one is their own ancestor
for (const p of people.values()) for (const r of [p.fatherId, p.motherId, ...p.spouseIds]) if (r && !people.has(r)) throw new Error(`${p.id} → missing ${r}`);
for (const p of people.values()) {
  const seen = new Set<string>(); const st = [p.fatherId, p.motherId];
  while (st.length) { const x = st.pop(); if (!x) continue; if (x === p.id) throw new Error('cycle at ' + p.id); if (seen.has(x)) continue; seen.add(x); const q = people.get(x)!; st.push(q.fatherId, q.motherId); }
}

const list = [...people.values()];
writeFileSync('data/hindu-gods-family-tree.json', JSON.stringify({
  title: 'Hindu deities & epic dynasties',
  note: 'Gods, sages, the Solar (Ikshvaku) and Lunar (Kuru, Yadava) dynasties. Compiled from the Valmiki Ramayana and from Wikipedia articles that summarise the Mahabharata and Puranas. Tags mark variants, lineage gaps, and later-tradition entries.',
  sources: S, focusId: 'krishna', people: list,
}, null, 2));

// ---------- GEDCOM 5.5.1 with real source records ----------
const srcIds = new Map(Object.keys(S).map((k, i) => [k, `S${i + 1}`]));
const usedSrc = (p: Person) => [...new Set(p.media.filter((m) => m.kind === 'document').map((m) => Object.keys(S).find((k) => S[k].cite === m.title)).filter(Boolean) as string[])];
const wrap = (tag: string, text: string, level = 1) => {
  // GEDCOM lines must stay short: newlines become CONT lines, long lines are split with CONC
  const out: string[] = [];
  text.split(/\r?\n/).forEach((line, li) => {
    const chunks = line.match(/.{1,200}/g) ?? [''];
    chunks.forEach((c, ci) => out.push(li === 0 && ci === 0 ? `${level} ${tag} ${c}` : `${level + 1} ${ci === 0 ? 'CONT' : 'CONC'} ${c}`));
  });
  return out;
};
const g: string[] = ['0 HEAD', '1 SOUR OURFAMILYTREE', '2 NAME OurFamilyTree', '1 GEDC', '2 VERS 5.5.1', '2 FORM LINEAGE-LINKED', '1 CHAR UTF-8', `1 DATE ${new Date().toUTCString().slice(5, 16).toUpperCase()}`, ...wrap('NOTE', 'Family tree of the major Hindu deities and the epic dynasties (Solar/Ikshvaku, Lunar/Kuru, Yadava), focus Krishna. Mythological genealogy: no dates. Persons named “··· … ···” are placeholders for omitted generations. See hindu-gods-family-tree-sources.md.')];
const fams = new Map<string, { id: string; h?: string; w?: string; c: string[] }>();
let fi = 1;
const fam = (h?: string, w?: string) => { const k = `${h ?? ''}|${w ?? ''}`; if (!fams.has(k)) fams.set(k, { id: `F${fi++}`, h, w, c: [] }); return fams.get(k)!; };
for (const p of list) {
  for (const s of p.spouseIds) { const S2 = people.get(s)!; const [h, w] = p.gender === 'F' || (p.gender === 'U' && S2.gender === 'M') ? [s, p.id] : [p.id, s]; fam(h, w); }
  if (p.fatherId || p.motherId) fam(p.fatherId, p.motherId).c.push(p.id);
}
const famcOf = new Map<string, string>(), famsOf = new Map<string, string[]>();
for (const f of fams.values()) { f.c.forEach((c) => famcOf.set(c, f.id)); for (const x of [f.h, f.w]) if (x) famsOf.set(x, [...(famsOf.get(x) ?? []), f.id]); }
for (const p of list) {
  g.push(`0 @${p.id.toUpperCase()}@ INDI`, `1 NAME ${p.given} //`, `2 GIVN ${p.given}`, `1 SEX ${p.gender}`);
  if (p.birthPlace) g.push('1 BIRT', `2 PLAC ${p.birthPlace}`);
  if (p.occupation) g.push(`1 OCCU ${p.occupation}`);
  if (p.tags.length) g.push(`1 NOTE Tags: ${p.tags.join(', ')}`);
  if (p.bio) g.push(...wrap('NOTE', p.bio.split('\n\nSources:')[0]));
  for (const k of usedSrc(p)) g.push(`1 SOUR @${srcIds.get(k)}@`);
  if (famcOf.has(p.id)) g.push(`1 FAMC @${famcOf.get(p.id)}@`);
  for (const f of famsOf.get(p.id) ?? []) g.push(`1 FAMS @${f}@`);
}
for (const f of fams.values()) {
  g.push(`0 @${f.id}@ FAM`);
  if (f.h) g.push(`1 HUSB @${f.h.toUpperCase()}@`);
  if (f.w) g.push(`1 WIFE @${f.w.toUpperCase()}@`);
  f.c.forEach((c) => g.push(`1 CHIL @${c.toUpperCase()}@`));
}
for (const [k, v] of Object.entries(S)) g.push(`0 @${srcIds.get(k)}@ SOUR`, ...wrap('TITL', v.cite), `1 WWW ${v.url}`);
g.push('0 TRLR');
writeFileSync('data/hindu-gods-family-tree.ged', g.join('\n') + '\n');
console.log('people', list.length, 'families', fams.size, 'sources', Object.keys(S).length);
