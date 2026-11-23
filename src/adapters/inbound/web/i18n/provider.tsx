'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { translateText, type Locale } from '@/shared/i18n/messages';
const Context = createContext<{locale: Locale; setLocale: (locale: Locale) => void}>({locale:'es',setLocale:()=>{}});
export function I18nProvider({children}: {children:ReactNode}) {
  const [locale,setValue]=useState<Locale>('es');
  useEffect(()=>{try{setValue(localStorage.getItem('workshop-language')==='en'?'en':'es');}catch{}},[]);
  useEffect(()=>{document.documentElement.lang=locale;},[locale]);
  useEffect(()=>{
    function onInvalid(event:Event){const field=event.target;if(!(field instanceof HTMLInputElement||field instanceof HTMLSelectElement||field instanceof HTMLTextAreaElement))return;field.setCustomValidity('');const v=field.validity;let message='Check this value.';if(v.valueMissing)message='Complete this field.';else if(v.badInput)message='Use a valid number.';else if(v.patternMismatch)message='Use the required format.';else if(v.typeMismatch||v.stepMismatch)message='Choose a valid value.';else if(field instanceof HTMLInputElement){if(v.tooShort)message=`Use at least ${field.minLength} characters.`;else if(v.rangeUnderflow)message=`Minimum: ${field.min}`;else if(v.rangeOverflow)message=`Maximum: ${field.max}`;}field.setCustomValidity(translateText(locale,message));}
    function onInput(event:Event){const field=event.target;if(field instanceof HTMLInputElement||field instanceof HTMLSelectElement||field instanceof HTMLTextAreaElement)field.setCustomValidity('');}
    document.addEventListener('invalid',onInvalid,true);document.addEventListener('input',onInput,true);document.addEventListener('change',onInput,true);
    return ()=>{document.removeEventListener('invalid',onInvalid,true);document.removeEventListener('input',onInput,true);document.removeEventListener('change',onInput,true);};
  },[locale]);
  function setLocale(value:Locale){setValue(value);try{localStorage.setItem('workshop-language',value);}catch{}}
  return <Context.Provider value={{locale,setLocale}}>{children}</Context.Provider>;
}
export function useI18n(){
  const {locale,setLocale}=useContext(Context);
  const t=(value:string)=>translateText(locale,value);
  const localize=(value:ReactNode):ReactNode=>typeof value==='string'?t(value):Array.isArray(value)?value.map(localize):value;
  const language=locale==='es'?'es-CO':'en-US';
  return {locale,setLocale,t,localize,
    money:(value:number|null|undefined)=>value==null?t('Restricted'):new Intl.NumberFormat(language,{style:'currency',currency:'COP',maximumFractionDigits:2,minimumFractionDigits:0}).format(value/100),
    qty:(value:number)=>new Intl.NumberFormat(language,{maximumFractionDigits:3}).format(value/1000),
    dateAt:(minute:number)=>new Intl.DateTimeFormat(language,{timeZone:'America/Bogota',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(Date.parse('2026-11-20T09:00:00-05:00')+minute*60000)),
  };
}
export function LanguageSwitch(){const {locale,setLocale,t}=useI18n();return <div className="language-switch" role="group" aria-label={t('Language')}><button type="button" onClick={()=>setLocale('es')} aria-pressed={locale==='es'}>ES</button><button type="button" onClick={()=>setLocale('en')} aria-pressed={locale==='en'}>EN</button></div>;}
