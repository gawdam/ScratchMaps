// Peaks: Natural Earth 1:10m elevation points, selected by scalerank (public domain).
// Forests: WWF/RESOLVE 2017 ecoregions, area-ranked points within each realm (CC BY 4.0).
export type LandmarkKind = 'mountain' | 'forest';

export type Landmark = {
  name: string;
  kind: LandmarkKind;
  lat: number;
  lng: number;
  elevation_m?: number | null;
  realm?: string;
  area_km2?: number;
};

export const landmarks: Landmark[] = [
  {
    'name': 'Mount Kilimanjaro',
    'kind': 'mountain',
    'lat': -3.07574,
    'lng': 37.35328,
    'elevation_m': 5895,
  },
  {
    'name': 'Vinson Massif',
    'kind': 'mountain',
    'lat': -78.52935,
    'lng': -85.63372,
    'elevation_m': 4892,
  },
  {
    'name': 'Mount Everest',
    'kind': 'mountain',
    'lat': 27.98048,
    'lng': 86.88063,
    'elevation_m': 8848,
  },
  {
    'name': 'K2',
    'kind': 'mountain',
    'lat': 35.88239,
    'lng': 76.51319,
    'elevation_m': 8611,
  },
  {
    'name': 'Muztag Feng',
    'kind': 'mountain',
    'lat': 36.41651,
    'lng': 87.41322,
    'elevation_m': 6973,
  },
  {
    'name': 'Kailash',
    'kind': 'mountain',
    'lat': 31.0666,
    'lng': 81.31251,
    'elevation_m': 6638,
  },
  {
    'name': 'Gora Elbrus',
    'kind': 'mountain',
    'lat': 43.35517,
    'lng': 42.43922,
    'elevation_m': 5642,
  },
  {
    'name': 'Denali',
    'kind': 'mountain',
    'lat': 63.0694,
    'lng': -151.00731,
    'elevation_m': 6194,
  },
  {
    'name': 'Mount Whitney',
    'kind': 'mountain',
    'lat': 36.58271,
    'lng': -118.29223,
    'elevation_m': 4421,
  },
  {
    'name': 'Mount Kosciuszko',
    'kind': 'mountain',
    'lat': -36.45587,
    'lng': 148.26319,
    'elevation_m': 2228,
  },
  {
    'name': 'Cerro Aconcagua',
    'kind': 'mountain',
    'lat': -32.65569,
    'lng': -70.0158,
    'elevation_m': 6959,
  },
  {
    'name': 'Cero Raya',
    'kind': 'mountain',
    'lat': 5.45167,
    'lng': -66.3756,
    'elevation_m': 2070,
  },
  {
    'name': 'East Siberian taiga',
    'kind': 'forest',
    'lat': 61.3746,
    'lng': 113.46116,
    'realm': 'Palearctic',
    'area_km2': 3922555,
  },
  {
    'name': 'Scandinavian and Russian taiga',
    'kind': 'forest',
    'lat': 63.16808,
    'lng': 39.81594,
    'realm': 'Palearctic',
    'area_km2': 2170288,
  },
  {
    'name': 'Eastern Canadian Shield taiga',
    'kind': 'forest',
    'lat': 55.44611,
    'lng': -68.83571,
    'realm': 'Nearctic',
    'area_km2': 757987,
  },
  {
    'name': 'Midwest Canadian Shield forests',
    'kind': 'forest',
    'lat': 53.97638,
    'lng': -93.14877,
    'realm': 'Nearctic',
    'area_km2': 757041,
  },
  {
    'name': 'Southwest Amazon moist forests',
    'kind': 'forest',
    'lat': -10.48299,
    'lng': -71.06663,
    'realm': 'Neotropic',
    'area_km2': 746653,
  },
  {
    'name': 'Caatinga',
    'kind': 'forest',
    'lat': -9.49253,
    'lng': -40.19726,
    'realm': 'Neotropic',
    'area_km2': 731320,
  },
  {
    'name': 'Jian Nan subtropical evergreen forests',
    'kind': 'forest',
    'lat': 26.02497,
    'lng': 114.54164,
    'realm': 'Indomalayan',
    'area_km2': 662292,
  },
  {
    'name': 'Northeast Congolian lowland forests',
    'kind': 'forest',
    'lat': 0.96061,
    'lng': 27.03993,
    'realm': 'Afrotropic',
    'area_km2': 512304,
  },
  {
    'name': 'Northern Indochina subtropical forests',
    'kind': 'forest',
    'lat': 23.05973,
    'lng': 101.06916,
    'realm': 'Indomalayan',
    'area_km2': 435869,
  },
  {
    'name': 'Northwest Congolian lowland forests',
    'kind': 'forest',
    'lat': 1.01803,
    'lng': 13.91845,
    'realm': 'Afrotropic',
    'area_km2': 432190,
  },
  {
    'name': 'Eastern Australian temperate forests',
    'kind': 'forest',
    'lat': -31.33763,
    'lng': 151.76076,
    'realm': 'Australasia',
    'area_km2': 295113,
  },
  {
    'name': 'Southwest Australia savanna',
    'kind': 'forest',
    'lat': -30.1861,
    'lng': 116.48968,
    'realm': 'Australasia',
    'area_km2': 177468,
  },
];
