import { useEffect, useId, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import states from '../data/india-states.json';
import { storeRequest, StoreError } from '../services/storefrontApi';
import '../styles/address.css';

export type Address = { fullName: string; mobile: string; line1: string; line2: string; city: string; state: string; pincode: string };
export type LookupStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'unavailable' | 'mismatch';
export const emptyAddress: Address = { fullName: '', mobile: '', line1: '', line2: '', city: '', state: '', pincode: '' };
export const validState = (value: string) => states.includes(value);
export const addressError = (value: Address) => value.fullName.trim().length < 2 || !/^[6-9]\d{9}$/.test(value.mobile) || value.line1.trim().length < 5 || !value.city.trim() || !validState(value.state) || !/^[1-9]\d{5}$/.test(value.pincode) ? 'Enter a complete delivery address, select a full state name, and check your mobile number and PIN code.' : '';

export function StateSelect({ value, onChange, disabled, id }: { value: string; onChange: (value: string) => void; disabled?: boolean; id: string }) {
  const [open, setOpen] = useState(false), [active, setActive] = useState(-1);
  const options = states.filter(state => state.toLowerCase().startsWith(value.trim().toLowerCase()));
  const select = (state: string) => { onChange(state); setOpen(false); setActive(-1); };
  return <div className="v1-state-select">
    <label htmlFor={id}>State / Union territory</label>
    <input id={id} role="combobox" autoComplete="address-level1" aria-autocomplete="list" aria-expanded={open && !disabled} aria-controls={`${id}-list`} aria-activedescendant={open && active >= 0 && options[active] ? `${id}-${active}` : undefined} placeholder="Start typing, e.g. An" value={value} maxLength={80} required disabled={disabled}
      onFocus={() => { setOpen(true); setActive(-1); }}
      onChange={event => { onChange(event.target.value); setOpen(true); setActive(-1); }}
      onBlur={() => { setOpen(false); const match = states.find(state => state.toLowerCase() === value.trim().toLowerCase()); if (match) onChange(match); }}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive(index => options.length ? event.key === 'ArrowDown' ? (index + 1) % options.length : (index <= 0 ? options.length : index) - 1 : -1); }
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
        if (event.key === 'Enter' && open) { event.preventDefault(); const choice = options[active] || (options.length === 1 ? options[0] : null); if (choice) select(choice); }
      }} />
    {open && !disabled && <ul id={`${id}-list`} role="listbox" aria-label="States and Union territories" className="v1-state-options">
      {options.map((state, index) => <li id={`${id}-${index}`} key={state} role="option" aria-selected={index === active} className={index === active ? 'active' : ''} onPointerDown={event => event.preventDefault()} onMouseDown={event => event.preventDefault()} onClick={() => select(state)}>{state}</li>)}
      {!options.length && <li className="v1-state-empty" role="presentation">No matching state. Clear the field to see all states.</li>}
    </ul>}
  </div>;
}

type PostalResult = { pincode: string; state: string; states: string[]; city: string; cities: string[] };
export default function AddressFields({ value, onChange, disabled = false, includeRecipient = true, onLookupStatus }: { value: Address; onChange: Dispatch<SetStateAction<Address>>; disabled?: boolean; includeRecipient?: boolean; onLookupStatus?: (status: LookupStatus) => void }) {
  const id = useId(), latest = useRef(value);
  latest.current = value;
  const [status, setStatus] = useState<LookupStatus>('idle'), [location, setLocation] = useState<PostalResult | null>(null), [retry, setRetry] = useState(0);
  const update = useRef(onChange);
  update.current = onChange;
  useEffect(() => {
    setLocation(null);
    if (disabled || !/^[1-9]\d{5}$/.test(value.pincode)) { setStatus('idle'); return; }
    const pin = value.pincode, controller = new AbortController();
    setStatus('loading');
    const timer = window.setTimeout(() => {
      storeRequest<PostalResult>(`/locations/pincode/${pin}`, { signal: controller.signal }).then(data => {
        if (controller.signal.aborted || latest.current.pincode !== pin) return;
        if (data.pincode !== pin || !Array.isArray(data.states) || !data.states.length) throw new Error('Invalid PIN lookup response');
        setLocation(data); setStatus('found');
        update.current(previous => previous.pincode === pin ? { ...previous, city: data.city || previous.city, state: validState(data.state) ? data.state : previous.state } : previous);
      }).catch(error => { if (!controller.signal.aborted && latest.current.pincode === pin) setStatus(error instanceof StoreError && error.code === 'PIN_NOT_FOUND' ? 'not_found' : 'unavailable'); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value.pincode, retry, disabled]);
  const mismatch = status === 'found' && location?.pincode === value.pincode && !!value.state && validState(value.state) && !location.states.includes(value.state);
  const effectiveStatus = mismatch ? 'mismatch' : status;
  useEffect(() => { onLookupStatus?.(effectiveStatus); }, [effectiveStatus, onLookupStatus]);
  const field = (key: keyof Address, label: string, autoComplete: string, optional = false, wide = false) => <label className={wide ? 'v1-address-wide' : ''} htmlFor={`${id}-${key}`} key={key}>{label}<input id={`${id}-${key}`} name={key} autoComplete={autoComplete} required={!optional} disabled={disabled} maxLength={key === 'mobile' ? 10 : 250} inputMode={key === 'mobile' ? 'tel' : 'text'} value={value[key]} onChange={event => onChange(previous => ({ ...previous, [key]: key === 'mobile' ? event.target.value.replace(/\D/g, '') : event.target.value }))} /></label>;
  return <div className="v1-address-fields">
    {includeRecipient && <>{field('fullName', 'Full name', 'name')}{field('mobile', 'Mobile number', 'tel-national')}</>}
    <label htmlFor={`${id}-pin`}>PIN code<input id={`${id}-pin`} name="pincode" autoComplete="postal-code" inputMode="numeric" maxLength={6} pattern="[1-9][0-9]{5}" placeholder="6-digit PIN code" required disabled={disabled} aria-describedby={`${id}-status`} value={value.pincode} onChange={event => { const pin = event.target.value.replace(/\D/g, '').slice(0, 6); onChange(previous => pin === previous.pincode ? previous : { ...previous, pincode: pin, city: '', state: '' }); }} /></label>
    <div id={`${id}-status`} className="v1-address-status" role="status" aria-live="polite">
      {status === 'idle' && 'Enter your PIN code to fill city and state automatically.'}
      {status === 'loading' && 'Looking up your PIN code…'}
      {status === 'found' && !mismatch && 'City and state found. Check the city and enter your full street address.'}
      {mismatch && 'The selected state does not match this PIN code.'}
      {status === 'not_found' && 'PIN code not found. Please check all six digits.'}
      {status === 'unavailable' && <>PIN lookup is unavailable. Enter your city and select your state manually. <button type="button" disabled={disabled} onClick={() => setRetry(count => count + 1)}>Retry lookup</button></>}
    </div>
    {field('city', 'City / Town', 'address-level2')}
    <StateSelect id={`${id}-state`} value={value.state} disabled={disabled} onChange={state => onChange(previous => ({ ...previous, state }))} />
    {field('line1', 'House number, building and street', 'address-line1', false, true)}
    {field('line2', 'Area or landmark (optional)', 'address-line2', true, true)}
  </div>;
}
