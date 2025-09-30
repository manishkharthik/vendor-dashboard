import { ApplicationConfig } from '@angular/core'; 
import { provideHttpClient, withInterceptors } from '@angular/common/http'; 
import { provideRouter } from '@angular/router'; 
import { routes } from './app.routes'; 
import { apiInterceptor } from './interceptors/api.interceptor'; 
export const API_BASE_URL = 'http://localhost:5080';

export const appConfig: ApplicationConfig = { 
  providers: [ 
    provideRouter(routes), 
    provideHttpClient( withInterceptors([apiInterceptor]) ) 
  ], 
};
