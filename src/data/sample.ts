import type { Person, Gender, LifeEvent, MediaItem } from '../types';

// A fictional, multi-generation, multi-country family (Rossi · O'Brien · Chen · Wong lines)
// used to demo every feature. Nothing here describes real people.

type Row = [id: string, given: string, surname: string, g: Gender, born: string, bplace: string, died: string | null, dplace: string | null, father: string | null, mother: string | null, occupation: string, tags?: string, birthSurname?: string];

const N = 'Naples, Italy', BO = 'Boston, USA', SF = 'San Francisco, USA', GZ = 'Guangzhou, China', HK = 'Hong Kong', CK = 'Cork, Ireland', GW = 'Galway, Ireland';

const rows: Row[] = [
  // Generation -5 / -4 : Rossi & Esposito (Italy)
  ['f_rossi', 'Francesco', 'Rossi', 'M', '1845-03-12', N, '1910-11-02', N, null, null, 'Fisherman'],
  ['t_bruno', 'Teresa', 'Rossi', 'F', '1850-07-21', N, '1920-01-15', N, null, null, 'Lace maker', '', 'Bruno'],
  ['l_rossi', 'Luigi', 'Rossi', 'M', '1875-05-04', N, '1940-08-19', N, 'f_rossi', 't_bruno', 'Boat builder'],
  ['a_russo', 'Anna', 'Rossi', 'F', '1880-02-09', N, '1950-12-01', N, null, null, 'Seamstress', '', 'Russo'],
  ['v_esposito', 'Vincenzo', 'Esposito', 'M', '1878-09-30', N, '1944-04-11', N, null, null, 'Baker'],
  ['r_romano', 'Rosa', 'Esposito', 'F', '1882-06-17', N, '1961-03-03', N, null, null, 'Baker', '', 'Romano'],
  // O'Brien & Murphy (Ireland → Boston)
  ['m_obrien', 'Michael', "O'Brien", 'M', '1880-01-22', CK, '1945-10-10', CK, null, null, 'Farmer'],
  ['m_sullivan', 'Mary', "O'Brien", 'F', '1884-08-14', CK, '1952-02-27', CK, null, null, 'Farmer', '', 'Sullivan'],
  ['t_murphy', 'Thomas', 'Murphy', 'M', '1885-04-02', GW, '1955-06-21', BO, null, null, 'Dock worker', 'Immigrant'],
  ['c_kelly', 'Catherine', 'Murphy', 'F', '1889-12-08', GW, '1968-09-09', BO, null, null, 'Domestic worker', 'Immigrant', 'Kelly'],
  // Chen & Wong (China / Hong Kong)
  ['c_wei', 'Wei', 'Chen', 'M', '1900-02-16', GZ, '1965-07-07', GZ, null, null, 'Tea merchant'],
  ['l_mei', 'Mei', 'Chen', 'F', '1904-10-01', GZ, '1980-05-15', GZ, null, null, 'Teacher', '', 'Lin'],
  ['w_kwok', 'Kwok', 'Wong', 'M', '1905-11-11', HK, '1970-01-30', HK, null, null, 'Tailor'],
  ['h_siu', 'Siu', 'Wong', 'F', '1910-03-25', HK, '1995-08-08', HK, null, null, 'Tailor', '', 'Ho'],

  // Generation -3
  ['g_rossi', 'Giuseppe', 'Rossi', 'M', '1905-01-19', N, '1978-03-14', N, 'l_rossi', 'a_russo', 'Fisherman', 'Military'],
  ['m_esposito', 'Maria', 'Rossi', 'F', '1909-05-27', N, '1990-10-30', N, 'v_esposito', 'r_romano', 'Baker', '', 'Esposito'],
  ['p_obrien', 'Patrick', "O'Brien", 'M', '1908-07-04', CK, '1971-11-21', BO, 'm_obrien', 'm_sullivan', 'Police officer', 'Immigrant,Military'],
  ['s_obrien', 'Seán', "O'Brien", 'M', '1910-09-15', CK, '1980-04-04', CK, 'm_obrien', 'm_sullivan', 'Farmer'],
  ['b_murphy', 'Bridget', "O'Brien", 'F', '1911-02-01', BO, '1999-12-24', BO, 't_murphy', 'c_kelly', 'Nurse', '', 'Murphy'],
  ['c_ming', 'Ming', 'Chen', 'M', '1935-06-06', GZ, '2010-02-02', 'Shanghai, China', 'c_wei', 'l_mei', 'Engineer'],
  ['c_henry', 'Henry', 'Chen', 'M', '1932-04-18', GZ, '2018-01-09', SF, 'c_wei', 'l_mei', 'Restaurant owner', 'Immigrant'],
  ['w_lily', 'Lily', 'Chen', 'F', '1936-12-02', HK, null, null, 'w_kwok', 'h_siu', 'Pharmacist', 'Immigrant', 'Wong'],
  ['z_hui', 'Hui', 'Chen', 'F', '1937-03-03', 'Shanghai, China', '2019-06-01', 'Shanghai, China', null, null, 'Doctor', '', 'Zhao'],

  // Generation -2
  ['a_rossi', 'Antonio', 'Rossi', 'M', '1935-08-08', N, '2016-05-20', BO, 'g_rossi', 'm_esposito', 'Carpenter', 'Immigrant'],
  ['c_rossi', 'Carlo', 'Rossi', 'M', '1938-02-14', N, '2015-09-09', 'Rome, Italy', 'g_rossi', 'm_esposito', 'Chef'],
  ['l_ferrari', 'Lucia', 'Rossi', 'F', '1940-10-10', 'Milan, Italy', null, null, null, null, 'Architect', '', 'Ferrari'],
  ['m_obrien2', 'Margaret', 'Rossi', 'F', '1938-11-30', BO, null, null, 'p_obrien', 'b_murphy', 'School teacher', '', "O'Brien"],
  ['k_obrien', 'Kathleen', 'Doyle', 'F', '1940-04-12', BO, '2021-01-17', BO, 'p_obrien', 'b_murphy', 'Librarian', '', "O'Brien"],
  ['f_doyle', 'Frank', 'Doyle', 'M', '1937-07-07', BO, '2004-03-30', BO, null, null, 'Firefighter', 'Military'],
  ['a_obrien', 'Aoife', "O'Brien", 'F', '1940-01-05', CK, '2018-08-18', CK, 's_obrien', null, 'Postmistress'],
  ['c_jun', 'Jun', 'Chen', 'M', '1960-09-09', 'Shanghai, China', null, null, 'c_ming', 'z_hui', 'Professor'],

  // Generation -1
  ['m_rossi', 'Michael', 'Rossi', 'M', '1961-03-03', BO, null, null, 'a_rossi', 'm_obrien2', 'Lawyer'],
  ['s_johnson', 'Sarah', 'Rossi', 'F', '1962-06-22', 'Chicago, USA', null, null, null, null, 'Accountant', '', 'Johnson'],
  ['d_rossi', 'Daniel', 'Rossi', 'M', '1964-01-15', BO, null, null, 'a_rossi', 'm_obrien2', 'Architect'],
  ['g_chen', 'Grace', 'Rossi', 'F', '1966-05-09', SF, null, null, 'c_henry', 'w_lily', 'Physician', '', 'Chen'],
  ['t_rossi', 'Teresa', 'Walker', 'F', '1969-09-01', BO, null, null, 'a_rossi', 'm_obrien2', 'Journalist', 'Immigrant', 'Rossi'],
  ['j_walker', 'James', 'Walker', 'M', '1967-12-12', 'London, England', null, null, null, null, 'Editor'],
  ['d_chen', 'David', 'Chen', 'M', '1962-02-20', SF, null, null, 'c_henry', 'w_lily', 'Software engineer'],
  ['p_sharma', 'Priya', 'Chen', 'F', '1964-11-04', 'Mumbai, India', null, null, null, null, 'Data scientist', 'Immigrant', 'Sharma'],
  ['a_chen', 'Amy', 'Chen', 'F', '1970-07-30', SF, null, null, 'c_henry', 'w_lily', 'Musician'],
  ['m_rossi2', 'Marco', 'Rossi', 'M', '1965-04-25', 'Rome, Italy', null, null, 'c_rossi', 'l_ferrari', 'Film director'],
  ['g_rossi2', 'Giulia', 'Rossi', 'F', '1968-08-16', 'Milan, Italy', null, null, 'c_rossi', 'l_ferrari', 'Fashion designer'],
  ['s_doyle', 'Sean', 'Doyle', 'M', '1966-03-17', BO, null, null, 'f_doyle', 'k_obrien', 'Musician', 'Immigrant'],
  ['c_xia', 'Xia', 'Chen', 'F', '1988-01-21', 'Shanghai, China', null, null, 'c_jun', null, 'Game designer'],

  // Generation 0
  ['maya', 'Maya', 'Rossi', 'F', '1995-10-24', BO, null, null, 'd_rossi', 'g_chen', 'UX designer'],
  ['leo', 'Leo', 'Rossi', 'M', '1998-04-02', BO, null, null, 'd_rossi', 'g_chen', 'Marine biologist'],
  ['e_brooks', 'Ethan', 'Brooks', 'M', '1993-02-11', 'Denver, USA', null, null, null, null, 'Nurse'],
  ['e_rossi', 'Emma', 'Patel', 'F', '1990-05-05', 'Chicago, USA', null, null, 'm_rossi', 's_johnson', 'Veterinarian', 'Immigrant', 'Rossi'],
  ['r_patel', 'Ryan', 'Patel', 'M', '1989-09-19', 'Toronto, Canada', null, null, null, null, 'Pilot'],
  ['j_rossi', 'Jack', 'Rossi', 'M', '1993-12-01', 'Chicago, USA', null, null, 'm_rossi', 's_johnson', 'Chef'],
  ['o_walker', 'Oliver', 'Walker', 'M', '1999-06-14', 'London, England', null, null, 'j_walker', 't_rossi', 'Student'],
  ['c_walker', 'Chloe', 'Walker', 'F', '2002-02-28', 'London, England', null, null, 'j_walker', 't_rossi', 'Student'],
  ['ar_chen', 'Arjun', 'Chen', 'M', '1992-08-08', 'Seattle, USA', null, null, 'd_chen', 'p_sharma', 'Robotics engineer'],
  ['an_chen', 'Anika', 'Chen', 'F', '1996-03-15', 'Seattle, USA', null, null, 'd_chen', 'p_sharma', 'Medical student'],
  ['s_rossi', 'Sofia', 'Rossi', 'F', '1995-11-11', 'Rome, Italy', null, null, 'm_rossi2', null, 'Photographer'],
  ['l_doyle', 'Liam', 'Doyle', 'M', '1997-07-07', 'Dublin, Ireland', null, null, 's_doyle', null, 'Software developer'],

  // Generation +1
  ['noah', 'Noah', 'Brooks', 'M', '2023-05-18', BO, null, null, 'e_brooks', 'maya', ''],
  ['ava', 'Ava', 'Patel', 'F', '2020-01-09', 'Toronto, Canada', null, null, 'r_patel', 'e_rossi', ''],
];

const marriages: [string, string, number, string][] = [
  ['f_rossi', 't_bruno', 1872, N], ['l_rossi', 'a_russo', 1902, N], ['v_esposito', 'r_romano', 1905, N],
  ['m_obrien', 'm_sullivan', 1906, CK], ['t_murphy', 'c_kelly', 1909, BO], ['c_wei', 'l_mei', 1928, GZ],
  ['w_kwok', 'h_siu', 1932, HK], ['g_rossi', 'm_esposito', 1932, N], ['p_obrien', 'b_murphy', 1936, BO],
  ['c_henry', 'w_lily', 1959, SF], ['c_ming', 'z_hui', 1958, 'Shanghai, China'], ['a_rossi', 'm_obrien2', 1959, BO],
  ['c_rossi', 'l_ferrari', 1963, 'Rome, Italy'], ['f_doyle', 'k_obrien', 1962, BO], ['m_rossi', 's_johnson', 1988, 'Chicago, USA'],
  ['d_rossi', 'g_chen', 1993, SF], ['j_walker', 't_rossi', 1997, 'London, England'], ['d_chen', 'p_sharma', 1990, 'Seattle, USA'],
  ['e_brooks', 'maya', 2021, BO], ['r_patel', 'e_rossi', 2017, 'Toronto, Canada'],
];

const migrations: [string, number, string, string, string][] = [
  ['t_murphy', 1905, GW, BO, 'Sailed from Queenstown to Boston aboard the RMS Ivernia'],
  ['c_kelly', 1907, GW, BO, 'Emigrated to Boston to work in service'],
  ['p_obrien', 1927, CK, BO, 'Left Cork for Boston, joined the police in 1931'],
  ['a_rossi', 1956, N, BO, 'Crossed the Atlantic with one suitcase and a carpenter’s plane'],
  ['c_henry', 1952, GZ, SF, 'Arrived in San Francisco, worked in his uncle’s restaurant'],
  ['w_lily', 1957, HK, SF, 'Moved to San Francisco to study pharmacy'],
  ['c_ming', 1956, GZ, 'Shanghai, China', 'Moved to Shanghai for engineering work'],
  ['p_sharma', 1987, 'Mumbai, India', 'Seattle, USA', 'Moved to Seattle for graduate school'],
  ['t_rossi', 1995, BO, 'London, England', 'Relocated to London as a foreign correspondent'],
  ['e_rossi', 2016, 'Chicago, USA', 'Toronto, Canada', 'Moved to Toronto for a veterinary residency'],
  ['s_doyle', 1994, BO, 'Dublin, Ireland', 'Returned to the old country to play music'],
  ['c_rossi', 1962, N, 'Rome, Italy', 'Opened a trattoria in Trastevere'],
];

const extraEvents: [string, number, LifeEvent['type'], string, string?][] = [
  ['g_rossi', 1940, 'military', 'Conscripted into the Regia Marina', N],
  ['p_obrien', 1943, 'military', 'Served with the US Army in Europe', 'London, England'],
  ['f_doyle', 1957, 'military', 'US Navy, stationed in Norfolk'],
  ['a_rossi', 1964, 'career', 'Opened Rossi & Sons Carpentry', BO],
  ['c_henry', 1961, 'career', 'Opened the Golden Gate Noodle House', SF],
  ['m_obrien2', 1960, 'career', 'Began teaching 3rd grade in Dorchester', BO],
  ['d_rossi', 1986, 'education', 'Graduated from MIT School of Architecture', BO],
  ['g_chen', 1992, 'education', 'MD, UCSF School of Medicine', SF],
  ['maya', 2017, 'education', 'BFA, Rhode Island School of Design'],
  ['maya', 2022, 'residence', 'Bought first home in Jamaica Plain', BO],
  ['leo', 2021, 'career', 'Joined the Woods Hole research fleet'],
  ['b_murphy', 1944, 'career', 'Head nurse, Boston City Hospital', BO],
  ['c_wei', 1925, 'career', 'Founded a tea trading house', GZ],
  ['c_xia', 2014, 'career', 'Shipped her first indie game'],
  ['ar_chen', 2018, 'career', 'Joined a Mars rover team'],
];

const bios: Record<string, string> = {
  maya: 'Designer, gardener and the keeper of this family tree. Started collecting stories from Grandma Lily in 2019 and never stopped.',
  a_rossi: 'Antonio arrived in Boston in 1956 with a single suitcase and his father’s carpenter’s plane. He built half the porches in the North End and sang Neapolitan songs while he worked.',
  m_obrien2: 'Margaret taught third grade for 38 years. Former students still send Christmas cards. She met Antonio at a dance in 1958 — he couldn’t dance, she taught him.',
  c_henry: 'Henry opened the Golden Gate Noodle House in 1961. It ran for 40 years and fed three generations of the neighborhood.',
  w_lily: 'Lily came to San Francisco to study pharmacy and ran the family pharmacy until 2001. At 89 she still does the crossword in ink.',
  p_obrien: 'Patrick left Cork at 19. He walked the beat in South Boston and served in Europe during WWII.',
  t_murphy: 'Thomas worked the Boston docks for 40 years. Family legend says he once arm-wrestled a Red Sox pitcher.',
  g_rossi: 'Giuseppe fished the Bay of Naples his whole life, except for the war years in the navy.',
  f_rossi: 'The earliest Rossi we can document. Appears in the 1871 parish records of Santa Lucia.',
};

const media: [string, MediaItem['kind'], string, number?, string?][] = [
  ['a_rossi', 'document', 'Ship manifest — SS Cristoforo Colombo', 1956, 'Line 14: ROSSI, Antonio, 21, carpenter'],
  ['a_rossi', 'photo', 'Wedding day at St. Leonard’s', 1959],
  ['m_obrien2', 'photo', 'Class photo, Dorchester Elementary', 1972],
  ['t_murphy', 'document', 'Naturalization certificate', 1912],
  ['p_obrien', 'document', 'WWII discharge papers', 1945],
  ['c_henry', 'photo', 'Golden Gate Noodle House opening', 1961],
  ['w_lily', 'story', 'Recorded interview: “Crossing the Pacific”', 2019, '42-minute audio transcript'],
  ['f_rossi', 'document', 'Parish baptism record', 1845],
  ['maya', 'photo', 'Noah’s first birthday', 2024],
  ['g_rossi', 'photo', 'On the boat, Bay of Naples', 1938],
];

export function buildSample(): Person[] {
  const map = new Map<string, Person>();
  for (const r of rows) {
    const [id, given, surname, gender, born, bplace, died, dplace, father, mother, occupation, tags, birthSurname] = r;
    const by = +born.slice(0, 4);
    const events: LifeEvent[] = [{ id: id + '-b', year: by, type: 'birth', title: 'Born', place: bplace }];
    if (died) events.push({ id: id + '-d', year: +died.slice(0, 4), type: 'death', title: 'Died', place: dplace ?? undefined });
    map.set(id, {
      id, given, surname, gender, birthDate: born, birthPlace: bplace,
      deathDate: died ?? undefined, deathPlace: dplace ?? undefined,
      fatherId: father ?? undefined, motherId: mother ?? undefined,
      spouseIds: [], occupation: occupation || undefined, bio: bios[id],
      tags: tags ? tags.split(',') : [], events, media: [], birthSurname,
    });
  }
  for (const [a, b, y, pl] of marriages) {
    const A = map.get(a)!, B = map.get(b)!;
    A.spouseIds.push(b); B.spouseIds.push(a);
    A.events.push({ id: `${a}-m-${b}`, year: y, type: 'marriage', title: `Married ${B.given} ${B.birthSurname ?? B.surname}`, place: pl });
    B.events.push({ id: `${b}-m-${a}`, year: y, type: 'marriage', title: `Married ${A.given} ${A.birthSurname ?? A.surname}`, place: pl });
  }
  for (const [id, y, from, to, title] of migrations) {
    map.get(id)!.events.push({ id: `${id}-mig-${y}`, year: y, type: 'migration', title, place: from, toPlace: to });
  }
  extraEvents.forEach(([id, y, type, title, place], i) => map.get(id)!.events.push({ id: `${id}-x${i}`, year: y, type, title, place }));
  media.forEach(([id, kind, title, year, note], i) => map.get(id)!.media.push({ id: `md${i}`, kind, title, year, note }));
  for (const p of map.values()) p.events.sort((a, b) => a.year - b.year);
  return [...map.values()];
}

export const SAMPLE_FOCUS = 'maya';

import type { Capsule } from '../types';
/** Demo time capsules: one already unlocked (from Antonio, who died in 2016) and one sealed until 2041. */
export const SAMPLE_CAPSULES: Capsule[] = [
  {
    id: 'cap-antonio', toId: 'maya', fromId: 'a_rossi', fromName: 'Antonio Rossi',
    title: 'For my Maya, when you are all grown up',
    message: 'Cara Maya,\n\nWhen I came to Boston I had one suitcase and my father’s carpenter’s plane. The plane is in the blue toolbox in your father’s garage — it is yours now. Use it to build something with your hands, even something small.\n\nRemember: measure twice, cut once, and always sing while you work. Your Nonna says I sing badly. She is right, but the wood does not mind.\n\nCon tutto il mio amore,\nNonno Antonio',
    unlockDate: '2016-10-24', unlockLabel: 'on Maya’s 21st birthday', createdAt: '2009-12-25T10:00:00.000Z',
  },
  {
    id: 'cap-noah', toId: 'noah', fromId: 'maya', fromName: 'Maya Rossi',
    title: 'Open on your 18th birthday',
    message: 'Noah — this is sealed. It opens on your 18th birthday.',
    unlockDate: '2041-05-18', unlockLabel: 'on Noah’s 18th birthday', createdAt: '2026-01-01T09:00:00.000Z',
  },
];
