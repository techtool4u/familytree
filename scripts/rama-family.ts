/**
 * Family tree of Lord Rama (Ikshvaku / Raghu dynasty) built from cited sources.
 * Run: npx esbuild scripts/rama-family.ts --bundle --platform=node --outfile=/tmp/rama.cjs && node /tmp/rama.cjs
 * Writes data/rama-family-tree.json (Kindred import) and data/rama-family-tree.ged (GEDCOM 5.5.1).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import type { Person, Gender, MediaItem } from '../src/types';
import { toGedcom } from '../src/lib/gedcom';

const VR = 'https://www.valmikiramayan.net/utf8/';
export const SOURCES: Record<string, { cite: string; url: string }> = {
  'VR1.18': { cite: 'Valmiki Ramayana, Bala Kanda, Sarga 18 (birth of the four princes)', url: VR + 'baala/sarga18/balasans18.htm' },
  'VR1.38': { cite: 'Valmiki Ramayana, Bala Kanda, Sarga 38 (Sagara’s queens and sons)', url: VR + 'baala/sarga38/balasans38.htm' },
  'VR1.66': { cite: 'Valmiki Ramayana, Bala Kanda, Sarga 66 (Janaka finds Sita in the furrow)', url: VR + 'baala/sarga66/balasans66.htm' },
  'VR1.70': { cite: 'Valmiki Ramayana, Bala Kanda, Sarga 70 (Vasishtha recites the Ikshvaku lineage)', url: VR + 'baala/sarga70/balasans70.htm' },
  'VR1.71': { cite: 'Valmiki Ramayana, Bala Kanda, Sarga 71 (Janaka recites the Videha lineage)', url: VR + 'baala/sarga71/balasans71.htm' },
  'VR1.72': { cite: 'Valmiki Ramayana, Bala Kanda, Sarga 72 (Kushadhvaja’s daughters proposed)', url: VR + 'baala/sarga72/balasans72.htm' },
  'VR1.73': { cite: 'Valmiki Ramayana, Bala Kanda, Sarga 73 (the four weddings)', url: VR + 'baala/sarga73/balasans73.htm' },
  'VR2.110': { cite: 'Valmiki Ramayana, Ayodhya Kanda, Sarga 110 (lineage repeated to Rama)', url: VR + 'ayodhya/sarga110/ayodhyasans110.htm' },
  'W-Lakshmana': { cite: 'Wikipedia, “Lakshmana” (Uttara Kanda: sons Angada & Chandraketu)', url: 'https://en.wikipedia.org/wiki/Lakshmana' },
  'W-Bharata': { cite: 'Wikipedia, “Bharata (Ramayana)” (sons Taksha & Pushkala; cites 1894 Chackravarti translation)', url: 'https://en.wikipedia.org/wiki/Bharata_(Ramayana)' },
  'W-Shatrughna': { cite: 'Wikipedia, “Shatrughna” (sons Subahu & Shatrughati)', url: 'https://en.wikipedia.org/wiki/Shatrughna' },
  'W-Kusha': { cite: 'Wikipedia, “Kusha (Ramayana)” (Uttara Kanda; Raghuvamsha: wife Kumudvati, son Atithi)', url: 'https://en.wikipedia.org/wiki/Kusha_(Ramayana)' },
  'W-Lava': { cite: 'Wikipedia, “Lava (Ramayana)” (Shravasti; Ananda Ramayana: wife Sumati)', url: 'https://en.wikipedia.org/wiki/Lava_(Ramayana)' },
  'W-Shanta': { cite: 'Wikipedia, “Shanta (Ramayana)” (parentage differs by recension)', url: 'https://en.wikipedia.org/wiki/Shanta_(Ramayana)' },
  'W-Kaikeyi': { cite: 'Wikipedia, “Kaikeyi” (father Ashvapati of Kekaya, brother Yudhajit)', url: 'https://en.wikipedia.org/wiki/Kaikeyi' },
  'W-Sita': { cite: 'Wikipedia, “Sita” (mother Sunayana per later tradition)', url: 'https://en.wikipedia.org/wiki/Sita' },
  'W-Raghuvamsha': { cite: 'Kalidasa, Raghuvamsha (via Wikipedia “Raghuvamsha”): Dilipa → Raghu → Aja (m. Indumati) → Dasharatha', url: 'https://en.wikipedia.org/wiki/Raghuvamsha' },
};

type R = [id: string, name: string, g: Gender, father: string | null, mother: string | null, src: string[], note: string, tags?: string, place?: string];

// ---- Solar (Ikshvaku) line exactly as in Valmiki Ramayana 1.70.19–43 ----
const rows: R[] = [
  ['brahma', 'Brahma', 'M', null, null, ['VR1.70'], 'The Creator; head of the lineage recited by Vasishtha (1.70.19–20).', 'Deity'],
  ['marichi', 'Marichi', 'M', 'brahma', null, ['VR1.70'], 'Son of Brahma (1.70.20).', 'Sage'],
  ['kashyapa', 'Kashyapa', 'M', 'marichi', null, ['VR1.70'], 'Son of Marichi (1.70.20).', 'Sage'],
  ['vivasvan', 'Vivasvan (Surya)', 'M', 'kashyapa', null, ['VR1.70'], 'The Sun god, son of Kashyapa (1.70.20). The dynasty is called Suryavamsha (Solar dynasty) after him.', 'Deity'],
  ['manu', 'Vaivasvata Manu', 'M', 'vivasvan', null, ['VR1.70'], 'Son of the Sun (1.70.20); progenitor of mankind.', 'Ikshvaku dynasty'],
  ['ikshvaku', 'Ikshvaku', 'M', 'manu', null, ['VR1.70'], 'Son of Manu and first king of Ayodhya (1.70.21). The dynasty is named after him.', 'Ikshvaku dynasty,King', 'Ayodhya'],
  ['kukshi', 'Kukshi', 'M', 'ikshvaku', null, ['VR1.70'], 'Son of Ikshvaku (1.70.22).', 'Ikshvaku dynasty,King'],
  ['vikukshi', 'Vikukshi', 'M', 'kukshi', null, ['VR1.70'], 'Son of Kukshi (1.70.22).', 'Ikshvaku dynasty,King'],
  ['bana', 'Bana', 'M', 'vikukshi', null, ['VR1.70'], 'Son of Vikukshi (1.70.23).', 'Ikshvaku dynasty,King'],
  ['anaranya', 'Anaranya', 'M', 'bana', null, ['VR1.70'], 'Son of Bana (1.70.23).', 'Ikshvaku dynasty,King'],
  ['prithu', 'Prithu', 'M', 'anaranya', null, ['VR1.70'], 'Son of Anaranya (1.70.24).', 'Ikshvaku dynasty,King'],
  ['trishanku', 'Trishanku', 'M', 'prithu', null, ['VR1.70'], 'Son of Prithu (1.70.24).', 'Ikshvaku dynasty,King'],
  ['dhundhumara', 'Dhundhumara', 'M', 'trishanku', null, ['VR1.70'], 'Son of Trishanku (1.70.24).', 'Ikshvaku dynasty,King'],
  ['yuvanashva', 'Yuvanashva', 'M', 'dhundhumara', null, ['VR1.70'], 'Son of Dhundhumara (1.70.25).', 'Ikshvaku dynasty,King'],
  ['mandhata', 'Mandhata', 'M', 'yuvanashva', null, ['VR1.70'], 'Son of Yuvanashva (1.70.25).', 'Ikshvaku dynasty,King'],
  ['susandhi', 'Susandhi', 'M', 'mandhata', null, ['VR1.70'], 'Son of Mandhata (1.70.26).', 'Ikshvaku dynasty,King'],
  ['dhruvasandhi', 'Dhruvasandhi', 'M', 'susandhi', null, ['VR1.70'], 'Elder son of Susandhi (1.70.26); the line continues through him.', 'Ikshvaku dynasty,King'],
  ['prasenajit', 'Prasenajit', 'M', 'susandhi', null, ['VR1.70'], 'Second son of Susandhi (1.70.26).', 'Ikshvaku dynasty'],
  ['bharata1', 'Bharata (son of Dhruvasandhi)', 'M', 'dhruvasandhi', null, ['VR1.70'], 'Son of Dhruvasandhi (1.70.27). Not the same person as Rama’s brother Bharata.', 'Ikshvaku dynasty,King'],
  ['asita', 'Asita', 'M', 'bharata1', null, ['VR1.70'], 'Son of Bharata (1.70.27). Lost his kingdom and died while both his queens were pregnant (1.70.28–30). One queen is named Kalindi, but readings differ on which queen bore Sagara, so no mother is recorded here.', 'Ikshvaku dynasty,King'],
  ['sagara', 'Sagara', 'M', 'asita', null, ['VR1.70', 'VR1.38'], 'Born “with poison” (sa-gara), hence his name (1.70.37), blessed by sage Chyavana. Queens: Keshini of Vidarbha and Sumati, sister of Garuda (1.38.3–4). Sumati bore 60,000 sons (1.38.17).', 'Ikshvaku dynasty,King'],
  ['keshini', 'Keshini', 'F', null, null, ['VR1.38'], 'Elder queen of Sagara, daughter of the king of Vidarbha (1.38.3); mother of Asamanja (1.38.16).', 'Queen', 'Vidarbha'],
  ['sumati_s', 'Sumati', 'F', null, null, ['VR1.38'], 'Younger queen of Sagara, daughter of Arishtanemi and sister of Garuda (1.38.4). Mother of 60,000 sons (1.38.17).', 'Queen'],
  ['asamanja', 'Asamanja', 'M', 'sagara', 'keshini', ['VR1.70', 'VR1.38'], 'Son of Sagara and Keshini (1.38.16; 1.70.38).', 'Ikshvaku dynasty'],
  ['amshuman', 'Amshuman', 'M', 'asamanja', null, ['VR1.70', 'VR1.38'], 'Son of Asamanja (1.38.22–23; 1.70.38).', 'Ikshvaku dynasty,King'],
  ['dilipa', 'Dilipa', 'M', 'amshuman', null, ['VR1.70'], 'Son of Amshuman (1.70.38).', 'Ikshvaku dynasty,King'],
  ['bhagiratha', 'Bhagiratha', 'M', 'dilipa', null, ['VR1.70'], 'Son of Dilipa (1.70.38); brought the Ganga down to earth.', 'Ikshvaku dynasty,King'],
  ['kakutstha', 'Kakutstha', 'M', 'bhagiratha', null, ['VR1.70', 'VR2.110'], 'Son of Bhagiratha (1.70.39). Rama is often called “Kakutstha” after him (2.110.27).', 'Ikshvaku dynasty,King'],
  ['raghu', 'Raghu', 'M', 'kakutstha', null, ['VR1.70', 'VR2.110'], 'Son of Kakutstha (1.70.39). The “Raghavas” / Raghuvamsha are named after him (2.110.27).', 'Ikshvaku dynasty,King'],
  ['pravriddha', 'Pravriddha (Kalmashapada)', 'M', 'raghu', null, ['VR1.70', 'VR2.110'], 'Son of Raghu (1.70.39); also called Purushadaka, Kalmashapada and Saudasa (2.110.28).', 'Ikshvaku dynasty,King'],
  ['shankhana', 'Shankhana', 'M', 'pravriddha', null, ['VR1.70'], 'Son of Pravriddha (1.70.40).', 'Ikshvaku dynasty,King'],
  ['sudarshana', 'Sudarshana', 'M', 'shankhana', null, ['VR1.70'], 'Son of Shankhana (1.70.40).', 'Ikshvaku dynasty,King'],
  ['agnivarna', 'Agnivarna', 'M', 'sudarshana', null, ['VR1.70'], 'Son of Sudarshana (1.70.40).', 'Ikshvaku dynasty,King'],
  ['shighraga', 'Shighraga', 'M', 'agnivarna', null, ['VR1.70'], 'Son of Agnivarna (1.70.41).', 'Ikshvaku dynasty,King'],
  ['maru', 'Maru', 'M', 'shighraga', null, ['VR1.70'], 'Son of Shighraga (1.70.41).', 'Ikshvaku dynasty,King'],
  ['prashushruka', 'Prashushruka', 'M', 'maru', null, ['VR1.70'], 'Son of Maru (1.70.41).', 'Ikshvaku dynasty,King'],
  ['ambarisha', 'Ambarisha', 'M', 'prashushruka', null, ['VR1.70'], 'Son of Prashushruka (1.70.41).', 'Ikshvaku dynasty,King'],
  ['nahusha', 'Nahusha', 'M', 'ambarisha', null, ['VR1.70', 'VR2.110'], 'Son of Ambarisha (1.70.42).', 'Ikshvaku dynasty,King'],
  ['yayati', 'Yayati', 'M', 'nahusha', null, ['VR1.70', 'VR2.110'], 'Son of Nahusha in Bala Kanda 1.70.42. NOTE: Ayodhya Kanda 2.110.32 omits Yayati and makes Nabhaga the direct son of Nahusha.', 'Ikshvaku dynasty,King,Variant'],
  ['nabhaga', 'Nabhaga', 'M', 'yayati', null, ['VR1.70', 'VR2.110'], 'Son of Yayati (1.70.42); son of Nahusha in 2.110.32.', 'Ikshvaku dynasty,King'],
  ['aja', 'Aja', 'M', 'nabhaga', null, ['VR1.70', 'VR2.110', 'W-Raghuvamsha'], 'Son of Nabhaga (1.70.43; 2.110.33). In Kalidasa’s Raghuvamsha, Aja is instead the son of Raghu and married Indumati of Vidarbha.', 'Ikshvaku dynasty,King'],
  ['suvrata', 'Suvrata', 'M', 'nabhaga', null, ['VR2.110'], 'Named as Aja’s brother in Ayodhya Kanda 2.110.33.', 'Ikshvaku dynasty'],
  ['indumati', 'Indumati', 'F', null, null, ['W-Raghuvamsha'], 'Princess of Vidarbha who chose Aja at her svayamvara (Raghuvamsha, cantos 5–8). She is not named in Valmiki’s text.', 'Queen,Later tradition', 'Vidarbha'],

  // ---- Dasharatha's household ----
  ['dasharatha', 'Dasharatha', 'M', 'aja', 'indumati', ['VR1.70', 'VR2.110', 'W-Raghuvamsha'], 'King of Kosala at Ayodhya, son of Aja (1.70.43). Mother Indumati per Raghuvamsha.', 'Ikshvaku dynasty,King', 'Ayodhya'],
  ['kausalya', 'Kausalya', 'F', null, null, ['VR1.18'], 'Chief queen of Dasharatha; mother of Rama (1.18.10).', 'Queen', 'Kosala'],
  ['kaikeyi', 'Kaikeyi', 'F', 'ashvapati', null, ['VR1.18', 'W-Kaikeyi'], 'Queen of Dasharatha from Kekaya; mother of Bharata (1.18.13).', 'Queen', 'Kekaya'],
  ['sumitra', 'Sumitra', 'F', null, null, ['VR1.18'], 'Queen of Dasharatha; mother of the twins Lakshmana and Shatrughna (1.18.14).', 'Queen'],
  ['ashvapati', 'Ashvapati', 'M', null, null, ['W-Kaikeyi'], 'King of Kekaya; father of Kaikeyi.', 'King', 'Kekaya'],
  ['yudhajit', 'Yudhajit', 'M', 'ashvapati', null, ['W-Kaikeyi'], 'Prince of Kekaya, Kaikeyi’s brother and Bharata’s maternal uncle.', 'Prince', 'Kekaya'],
  ['shanta', 'Shanta', 'F', 'dasharatha', 'kausalya', ['W-Shanta'], 'DISPUTED: northern recensions and later literature make her Dasharatha’s daughter, adopted by King Romapada of Anga. Other scholars treat this as a later addition. Married the sage Rishyashringa, who performed the putrakameshti sacrifice for Dasharatha.', 'Princess,Disputed'],
  ['rishyashringa', 'Rishyashringa', 'M', null, null, ['W-Shanta'], 'Sage, husband of Shanta; led the sacrifice that led to the birth of the four princes.', 'Sage'],

  ['rama', 'Rama', 'M', 'dasharatha', 'kausalya', ['VR1.18', 'VR1.70', 'VR2.110'], 'Eldest son of Dasharatha, born to Kausalya on Chaitra Navami (1.18.8–11). Seventh avatar of Vishnu.', 'Ikshvaku dynasty,King,Avatar of Vishnu', 'Ayodhya'],
  ['bharata', 'Bharata', 'M', 'dasharatha', 'kaikeyi', ['VR1.18'], 'Son of Dasharatha and Kaikeyi, born the day after Rama (1.18.13–15).', 'Ikshvaku dynasty,Prince', 'Ayodhya'],
  ['lakshmana', 'Lakshmana', 'M', 'dasharatha', 'sumitra', ['VR1.18', 'VR1.70'], 'Son of Sumitra, elder of the twins (1.18.14–15); Rama’s constant companion.', 'Ikshvaku dynasty,Prince', 'Ayodhya'],
  ['shatrughna', 'Shatrughna', 'M', 'dasharatha', 'sumitra', ['VR1.18'], 'Younger twin, son of Sumitra (1.18.14, 1.18.32).', 'Ikshvaku dynasty,Prince', 'Ayodhya'],

  // ---- Videha (Janaka) line, Valmiki Ramayana 1.71.3–13 ----
  ['nimi', 'Nimi', 'M', null, null, ['VR1.71'], 'Founder of the Videha line of Mithila (1.71.3).', 'Videha dynasty,King', 'Mithila'],
  ['mithi', 'Mithi', 'M', 'nimi', null, ['VR1.71'], 'Son of Nimi (1.71.4); Mithila is named after him.', 'Videha dynasty,King', 'Mithila'],
  ['janaka1', 'Janaka I', 'M', 'mithi', null, ['VR1.71'], 'Son of Mithi and the first “Janaka” (1.71.4). Later kings took the title Janaka.', 'Videha dynasty,King', 'Mithila'],
  ['udavasu', 'Udavasu', 'M', 'janaka1', null, ['VR1.71'], '1.71.4', 'Videha dynasty,King'],
  ['nandivardhana', 'Nandivardhana', 'M', 'udavasu', null, ['VR1.71'], '1.71.5', 'Videha dynasty,King'],
  ['suketu', 'Suketu', 'M', 'nandivardhana', null, ['VR1.71'], '1.71.5', 'Videha dynasty,King'],
  ['devarata', 'Devarata', 'M', 'suketu', null, ['VR1.71'], '1.71.6. Shiva’s bow was entrusted to him.', 'Videha dynasty,King'],
  ['brihadratha', 'Brihadratha', 'M', 'devarata', null, ['VR1.71'], '1.71.6', 'Videha dynasty,King'],
  ['mahavira', 'Mahavira', 'M', 'brihadratha', null, ['VR1.71'], '1.71.7', 'Videha dynasty,King'],
  ['sudhriti', 'Sudhriti', 'M', 'mahavira', null, ['VR1.71'], '1.71.7', 'Videha dynasty,King'],
  ['dhrishtaketu', 'Dhrishtaketu', 'M', 'sudhriti', null, ['VR1.71'], '1.71.8', 'Videha dynasty,King'],
  ['haryashva', 'Haryashva', 'M', 'dhrishtaketu', null, ['VR1.71'], '1.71.8', 'Videha dynasty,King'],
  ['maru_v', 'Maru (of Videha)', 'M', 'haryashva', null, ['VR1.71'], '1.71.9. Not the same person as Maru of the Ikshvaku line.', 'Videha dynasty,King'],
  ['pratindhaka', 'Pratindhaka', 'M', 'maru_v', null, ['VR1.71'], '1.71.9', 'Videha dynasty,King'],
  ['kirtiratha', 'Kirtiratha', 'M', 'pratindhaka', null, ['VR1.71'], '1.71.9', 'Videha dynasty,King'],
  ['devamidha', 'Devamidha', 'M', 'kirtiratha', null, ['VR1.71'], '1.71.10', 'Videha dynasty,King'],
  ['vibudha', 'Vibudha', 'M', 'devamidha', null, ['VR1.71'], '1.71.10', 'Videha dynasty,King'],
  ['mahidhraka', 'Mahidhraka', 'M', 'vibudha', null, ['VR1.71'], '1.71.10', 'Videha dynasty,King'],
  ['kirtirata', 'Kirtirata', 'M', 'mahidhraka', null, ['VR1.71'], '1.71.11', 'Videha dynasty,King'],
  ['maharoma', 'Maharoma', 'M', 'kirtirata', null, ['VR1.71'], '1.71.11', 'Videha dynasty,King'],
  ['swarnaroma', 'Swarnaroma', 'M', 'maharoma', null, ['VR1.71'], '1.71.12', 'Videha dynasty,King'],
  ['hrasvaroma', 'Hrasvaroma', 'M', 'swarnaroma', null, ['VR1.71'], '1.71.12. Father of Janaka and Kushadhvaja (1.71.13).', 'Videha dynasty,King'],
  ['janaka', 'Janaka (Siradhvaja)', 'M', 'hrasvaroma', null, ['VR1.71', 'VR1.66'], 'King of Videha at Mithila, elder son of Hrasvaroma (1.71.13). Valmiki calls him only “Janaka”; the personal name Siradhvaja comes from Puranic tradition.', 'Videha dynasty,King', 'Mithila'],
  ['sunayana', 'Sunayana', 'F', null, null, ['W-Sita'], 'Queen of Janaka per later tradition. She is not named in Valmiki’s Bala Kanda.', 'Queen,Later tradition', 'Mithila'],
  ['kushadhvaja', 'Kushadhvaja', 'M', 'hrasvaroma', null, ['VR1.71', 'VR1.72'], 'Younger brother of Janaka (1.71.13), king of Sankashya; father of Mandavi and Shrutakirti (1.72.5–11).', 'Videha dynasty,King', 'Sankashya'],
  ['sita', 'Sita', 'F', 'janaka', 'sunayana', ['VR1.66', 'VR1.71', 'VR1.73'], '“Non-uterine” (ayonija) birth: Janaka found her in the furrow while ploughing a ritual field and raised her as his daughter (1.66.13–15). Hence she is called Bhumija, daughter of the Earth. Married Rama (1.73.26–27). Parents are recorded as her adoptive parents.', 'Videha dynasty,Avatar of Lakshmi,Adopted', 'Mithila'],
  ['urmila', 'Urmila', 'F', 'janaka', 'sunayana', ['VR1.71', 'VR1.73'], 'Daughter of Janaka, given to Lakshmana (1.71.20–21; 1.73.30–31).', 'Videha dynasty,Princess', 'Mithila'],
  ['mandavi', 'Mandavi', 'F', 'kushadhvaja', null, ['VR1.72', 'VR1.73'], 'Daughter of Kushadhvaja (1.72.11), married to Bharata (1.73.31–32).', 'Videha dynasty,Princess'],
  ['shrutakirti', 'Shrutakirti', 'F', 'kushadhvaja', null, ['VR1.72', 'VR1.73'], 'Daughter of Kushadhvaja (1.72.11), married to Shatrughna (1.73.32–33).', 'Videha dynasty,Princess'],

  // ---- Next generation (Uttara Kanda & later texts, via secondary sources) ----
  ['kusha', 'Kusha', 'M', 'rama', 'sita', ['W-Kusha'], 'Elder twin son of Rama and Sita, born at Valmiki’s hermitage (Uttara Kanda). Ruled southern Kosala from Kushasthali/Kushavati.', 'Ikshvaku dynasty,King,Uttara Kanda'],
  ['lava', 'Lava', 'M', 'rama', 'sita', ['W-Lava'], 'Younger twin son of Rama and Sita (Uttara Kanda). Ruled northern Kosala from Shravasti; traditionally linked with founding Lavapuri (Lahore).', 'Ikshvaku dynasty,King,Uttara Kanda'],
  ['kumudvati', 'Kumudvati', 'F', null, null, ['W-Kusha'], 'Wife of Kusha, daughter of the Naga chief Kumuda (Raghuvamsha, canto 16). The Ananda Ramayana calls her Champika.', 'Naga,Later tradition'],
  ['sumati_l', 'Sumati', 'F', null, null, ['W-Lava'], 'Wife of Lava according to the Ananda Ramayana.', 'Later tradition'],
  ['atithi', 'Atithi', 'M', 'kusha', 'kumudvati', ['W-Kusha', 'W-Raghuvamsha'], 'Son of Kusha and his heir (Raghuvamsha, canto 17).', 'Ikshvaku dynasty,King,Later tradition'],
  ['angada_l', 'Angada (son of Lakshmana)', 'M', 'lakshmana', 'urmila', ['W-Lakshmana'], 'Son of Lakshmana and Urmila; given the kingdom of Karupada (Uttara Kanda). Not the same person as the vanara Angada, son of Vali.', 'Ikshvaku dynasty,Prince,Uttara Kanda'],
  ['chandraketu', 'Chandraketu', 'M', 'lakshmana', 'urmila', ['W-Lakshmana'], 'Son of Lakshmana and Urmila; ruled Malla with its capital Chandrakanti (Uttara Kanda).', 'Ikshvaku dynasty,Prince,Uttara Kanda'],
  ['taksha', 'Taksha', 'M', 'bharata', 'mandavi', ['W-Bharata'], 'Son of Bharata and Mandavi; established at Takshashila (Taxila).', 'Ikshvaku dynasty,Prince,Uttara Kanda', 'Takshashila'],
  ['pushkala', 'Pushkala', 'M', 'bharata', 'mandavi', ['W-Bharata'], 'Son of Bharata and Mandavi; established at Pushkalavati.', 'Ikshvaku dynasty,Prince,Uttara Kanda', 'Pushkalavati'],
  ['subahu', 'Subahu', 'M', 'shatrughna', 'shrutakirti', ['W-Shatrughna'], 'Son of Shatrughna and Shrutakirti; Shatrughna’s realm of Madhupura (Mathura) and Vidisha was divided between his sons.', 'Ikshvaku dynasty,Prince,Uttara Kanda'],
  ['shatrughati', 'Shatrughati', 'M', 'shatrughna', 'shrutakirti', ['W-Shatrughna'], 'Son of Shatrughna and Shrutakirti (see Subahu).', 'Ikshvaku dynasty,Prince,Uttara Kanda'],
];

const marriages: [string, string][] = [
  ['sagara', 'keshini'], ['sagara', 'sumati_s'], ['aja', 'indumati'],
  ['dasharatha', 'kausalya'], ['dasharatha', 'kaikeyi'], ['dasharatha', 'sumitra'],
  ['rishyashringa', 'shanta'], ['janaka', 'sunayana'],
  ['rama', 'sita'], ['lakshmana', 'urmila'], ['bharata', 'mandavi'], ['shatrughna', 'shrutakirti'],
  ['kusha', 'kumudvati'], ['lava', 'sumati_l'],
];
const weddingSrc: Record<string, string> = { rama: '1.73.26–27', lakshmana: '1.73.30–31', bharata: '1.73.31–32', shatrughna: '1.73.32–33' };

const people = new Map<string, Person>();
for (const [id, name, g, f, m, src, note, tags, place] of rows) {
  const media: MediaItem[] = src.map((k, i) => ({ id: `${id}-src${i}`, kind: 'document', title: SOURCES[k].cite, note: SOURCES[k].url }));
  people.set(id, {
    id, given: name, surname: '', gender: g, fatherId: f ?? undefined, motherId: m ?? undefined, spouseIds: [],
    birthPlace: place, bio: `${note}\n\nSources: ${src.map((k) => SOURCES[k].cite).join('; ')}.`,
    tags: (tags ?? '').split(',').filter(Boolean), events: [], media,
  });
}
for (const [a, b] of marriages) {
  const A = people.get(a)!, B = people.get(b)!;
  A.spouseIds.push(b); B.spouseIds.push(a);
  const ws = weddingSrc[a] ? ` (Valmiki Ramayana ${weddingSrc[a]}, at Mithila)` : '';
  // marriage events need a year for the timeline; mythological dates are unknown, so record them as notes instead
  if (ws) { A.bio += `\nMarried ${B.given}${ws}.`; B.bio += `\nMarried ${A.given}${ws}.`; }
}
// sanity: every referenced parent/spouse exists
for (const p of people.values()) for (const r of [p.fatherId, p.motherId, ...p.spouseIds]) if (r && !people.has(r)) throw new Error(`${p.id} → missing ${r}`);

const list = [...people.values()];
mkdirSync('data', { recursive: true });
writeFileSync('data/rama-family-tree.json', JSON.stringify({
  title: 'Family tree of Lord Rama (Ikshvaku / Raghu dynasty)',
  note: 'Mythological genealogy compiled primarily from the Valmiki Ramayana (Bala Kanda 1.18, 1.38, 1.66, 1.70–1.73; Ayodhya Kanda 2.110). Uttara Kanda and later-tradition entries are tagged. No historical dates exist, so no birth/death years are given.',
  sources: SOURCES,
  focusId: 'rama',
  people: list,
}, null, 2));
writeFileSync('data/rama-family-tree.ged', toGedcom(list).replace('1 SOUR Kindred', '1 SOUR Kindred\n1 NOTE Family tree of Lord Rama compiled from the Valmiki Ramayana (Bala Kanda 70-73, Ayodhya Kanda 110) and later texts; see rama-family-tree-sources.md'));
console.log('people:', list.length, 'marriages:', marriages.length);
