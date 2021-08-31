import { getGTagIds } from '~/configs/googe-gtag.config';

export default function (): void {
  const consent: boolean = (localStorage.getItem('consent') ?? 'false') === 'false';
  getGTagIds().forEach((id) => { (window as any)[`ga-disable-${id}`] = consent; });
}