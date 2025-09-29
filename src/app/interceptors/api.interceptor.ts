import { HttpInterceptorFn } from '@angular/common/http'; 
import { API_BASE_URL } from '../app.config';

export const apiInterceptor: HttpInterceptorFn = (req, next) => { 
  const BASE_URL = API_BASE_URL; 
  let url = req.url; 
  if (url.startsWith('/')) { 
    url = BASE_URL + url; 
  } 
  const cloned = req.clone({ url }); 
  return next(cloned); 
}; 


