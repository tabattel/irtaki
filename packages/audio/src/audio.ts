export type AudioFormat = 'opus';

export type AudioReciterId =
  | 'hafs-afassi'
  | 'hafs-abdelbasset'
  | 'hafs-soudais'
  | 'hafs-houssari'
  | 'hafs-chatir'
  | 'hafs-djebril';

export interface AudioReciter {
  id: AudioReciterId;
  name: string;
  arabicName: string;
  riwaya: 'hafs';
}

export interface AudioTrack {
  id: string;
  ayahId: string;
  reciterId: AudioReciterId;
  format: AudioFormat;
  durationMs: number;
  deliveryUrl: string;
}

export const HAFS_RECITERS: readonly AudioReciter[] = [
  {
    id: 'hafs-afassi',
    name: 'Mishary Rashid Alafasy',
    arabicName: 'مشاري راشد العفاسي',
    riwaya: 'hafs',
  },
  {
    id: 'hafs-abdelbasset',
    name: 'Abdelbasset Abdelsamad',
    arabicName: 'عبد الباسط عبد الصمد',
    riwaya: 'hafs',
  },
  {
    id: 'hafs-soudais',
    name: 'Abdul Rahman Al-Sudais',
    arabicName: 'عبد الرحمن السديس',
    riwaya: 'hafs',
  },
  {
    id: 'hafs-houssari',
    name: 'Mahmoud Khalil Al-Hussary',
    arabicName: 'محمود خليل الحصري',
    riwaya: 'hafs',
  },
  {
    id: 'hafs-chatir',
    name: 'Abu Bakr Al-Shatri',
    arabicName: 'أبو بكر الشاطري',
    riwaya: 'hafs',
  },
  {
    id: 'hafs-djebril',
    name: 'Mohamed Jebril',
    arabicName: 'محمد جبريل',
    riwaya: 'hafs',
  },
] as const;
