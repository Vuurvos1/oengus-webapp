import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { Router } from '@angular/router';
import { User } from '../model/user';
import { NwbAlertService } from '@wizishop/ng-wizi-bulma';
import {Observable, Subscription} from 'rxjs';
import { ValidationErrors } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { UserProfile } from '../model/user-profile';
import { BaseService } from './BaseService';
import {PatreonStatusDto, RelationShip} from '../model/annoying-patreon-shit';


@Injectable({
  providedIn: 'root'
})
export class UserService extends BaseService {

  private _user: User;

  constructor(private http: HttpClient,
              private router: Router,
              toastr: NwbAlertService,
              private translateService: TranslateService) {
    super(toastr, 'users');
  }

  getRedirectUri() {
    return encodeURIComponent(environment.loginRedirect);
  }

  getSyncRedirectUri() {
    return encodeURIComponent(environment.syncRedirect);
  }

  getTwitchClientId() {
    return environment.twitchClientId;
  }

  getTwitterClientId() {
    return environment.twitterClientId;
  }

  getDiscordClientId() {
    return environment.discordClientId;
  }

  getDiscordAuthUri(sync = false) {
    const redirectUri = sync ? this.getSyncRedirectUri() : this.getRedirectUri();

    return 'https://discordapp.com/api/oauth2/authorize?client_id=' +
      this.getDiscordClientId() + '&redirect_uri=' +
      redirectUri + 'discord&response_type=code&scope=identify&prompt=none';
  }

  getTwitchAuthUrl(sync = false) {
    const redirectUri = sync ? this.getSyncRedirectUri() : this.getRedirectUri();

    return 'https://id.twitch.tv/oauth2/authorize?client_id=' +
      this.getTwitchClientId() + '&redirect_uri=' +
      redirectUri + 'twitch&response_type=code&scope=openid';
  }

  getTwitterAuthUrl(sync = false) {
    const redirectUri = sync ? this.getSyncRedirectUri() : this.getRedirectUri();

    return 'https://twitter.com/i/oauth2/authorize?client_id=' +
      this.getTwitterClientId() + '&redirect_uri=' +
      redirectUri + 'twitter' +
      '&response_type=code&scope=users.read%20tweet.read' +
      '&code_challenge=speedrun&code_challenge_method=plain&state=unused';
  }

  get patreonSyncUrl(): string {
    return `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${
      environment.patreonClientId
    }&scope=identity&redirect_uri=${this.getSyncRedirectUri()}patreon`;
  }

  login(service: string, code?: string): Observable<any> {
    return this.http.post(this.url('login'), {
      service: service,
      code: code
    });
  }

  async sync(service: string, code?: string): Promise<any|RelationShip> {
    if (service === 'patreon') {
      const response = await this.http.get<RelationShip>(`${environment.patronApi}/sync?code=${code}`).toPromise() as any;

      const patreon = {
        ...response,
        id: response.data.id,
      };

      // Check if account is already synced
      await this.http.post(this.url('sync'), {
        service: 'patreon',
        code: patreon.id
      }).toPromise();

      return patreon;
    }

    return this.http.post(this.url('sync'), {
      service: service,
      code: code
    }).toPromise();
  }

  async updatePatreonStatus(userId: number, data: PatreonStatusDto): Promise<void> {
    return this.http.put<void>(this.url(`/${userId}/patreon-status`), data).toPromise();
  }

  logout(redirectHome: boolean = true) {
    this._user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    if (redirectHome) {
      this.router.navigate(['/']);
    }
  }

  getMe(): Observable<User> {
    return this.http.get<User>(this.url('me'));
  }

  me(): Subscription {
    return this.getMe().subscribe((response: User) => {
      this._user = response;
      if (!this._user.mail) {
        this.router.navigate(['user/new']);
      }
    }, error => {
      this._user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });
  }

  update(user: User) {
    return this.http.patch(this.url(`${user.id}`), user).subscribe(() => {
      if (!user.enabled) {
        this.translateService.get('alert.user.deactivate.success').subscribe((res: string) => {
          this.toast(res);
        });
        this.logout();
        return;
      }
      this._user = {...this._user, ...user};
      localStorage.setItem('user', JSON.stringify(this._user));
      this.translateService.get('alert.user.update.success').subscribe((res: string) => {
        this.toast(res);
      });
    }, () => {
      this.translateService.get('alert.user.update.error').subscribe((res: string) => {
        this.toast(res, 3000, 'warning');
      });
    });
  }

  exists(name: string): Observable<ValidationErrors> {
    if (!name) {
      return new Observable();
    }

    return this.http.get<ValidationErrors>(this.url(`${name}/exists`));
  }

  search(name: string): Observable<User[]> {
    return this.http.get<User[]>(this.url(`${name}/search`));
  }

  ban(id: number): Observable<void> {
    return this.http.post<void>(this.url(`${id}/ban`), null);
  }

  unban(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`${id}/ban`));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`${id}`));
  }

  setEnabled(id: number, enabled: boolean): Observable<void> {
    return this.http.post<void>(this.url(`${id}/enabled?status=${enabled}`), null);
  }

  getProfile(name: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(this.url(`${name}`));
  }

  isBanned(): boolean {
    return this._user.roles.includes('ROLE_BANNED');
  }

  isAdmin(): boolean {
    return this._user.roles.includes('ROLE_ADMIN');
  }

  isLoggedIn(): boolean {
    return Boolean(this._user);
  }

  set token(value: string) {
    localStorage.setItem('token', value);
  }

  get token(): string {
    return localStorage.getItem('token');
  }

  get user(): User {
    return this._user;
  }
}
