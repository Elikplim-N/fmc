import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlass,
  User,
  Phone,
  MapPin,
  ShieldCheck,
  ClipboardText,
  SignOut,
  UserCircle,
  CheckCircle,
  WarningCircle,
  X,
} from 'phosphor-react';
import { supabase } from './supabaseClient';
import './App.css';

/* ─── Custom Toast ───────────────────────────────────────── */
function Toast({ toast, onClose }) {
  if (!toast) return null;
  const isSuccess = toast.type === 'success';
  return (
    <div className={`toast toast--${toast.type}`}>
      <span className="toast-icon">
        {isSuccess
          ? <CheckCircle size={22} weight="fill" />
          : <WarningCircle size={22} weight="fill" />}
      </span>
      <span className="toast-msg">{toast.message}</span>
      <button className="toast-close" onClick={onClose}>
        <X size={16} weight="bold" />
      </button>
    </div>
  );
}

const INITIAL_FORM_DATA = {
  searchPerson: '',
  firstName: '',
  lastName: '',
  otherNames: '',
  phone: '',
  altPhone: '',
  locationSearch: '',
  locationManual: '',
  comments: '',
};

/* ─── Animated Splash / Loader ───────────────────────────── */
function SplashScreen({ hiding }) {
  return (
    <div className={`splash-screen${hiding ? ' hiding' : ''}`}>
      <div className="splash-logo-ring">
        <img src="/fmc-logo.png" alt="FMC Logo" className="splash-logo" />
      </div>
      <p className="splash-title">Faith Miracle Crusade</p>
      <p className="splash-subtitle">Outreach Portal</p>
      <div className="splash-bar-track">
        <div className="splash-bar-fill" />
      </div>
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────── */
function App() {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [collector, setCollector] = useState({ name: '', phone: '', accepted: false });
  const [hasTakenOath, setHasTakenOath] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [splashDone, setSplashDone] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };
  const [splashHiding, setSplashHiding] = useState(false);

  /* Splash: hide after 2.2 s */
  useEffect(() => {
    const hide = setTimeout(() => {
      setSplashHiding(true);
      setTimeout(() => setSplashDone(true), 700);
    }, 2200);
    return () => clearTimeout(hide);
  }, []);

  /* Restore collector from localStorage */
  useEffect(() => {
    const stored = localStorage.getItem('fmc_collector');
    if (stored) {
      setCollector(JSON.parse(stored));
      setHasTakenOath(true);
    }
  }, []);

  /* ── Handlers ── */
  const handleCollectorChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCollector(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleOathSubmit = (e) => {
    e.preventDefault();
    if (!collector.accepted) { showToast('You must agree to submit accurate data.', 'error'); return; }
    localStorage.setItem('fmc_collector', JSON.stringify(collector));
    setHasTakenOath(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.length > 2) {
      try {
        const { data, error } = await supabase
          .from('outreach_records')
          .select('*')
          .or(`first_name.ilike.%${value}%,last_name.ilike.%${value}%,phone.ilike.%${value}%`)
          .limit(10);
        if (error) throw error;
        setSearchResults(data || []);
      } catch (err) { console.error('Search error', err); }
    } else { setSearchResults([]); }
  };

  const selectPerson = (person) => {
    setFormData({
      searchPerson: '',
      firstName: person.first_name || '',
      lastName: person.last_name || '',
      otherNames: person.other_names || '',
      phone: person.phone || '',
      altPhone: person.alt_phone || '',
      locationSearch: person.location_search || '',
      locationManual: person.location_manual || '',
      comments: person.comments || '',
    });
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        other_names: formData.otherNames,
        phone: formData.phone,
        alt_phone: formData.altPhone,
        location_search: formData.locationSearch,
        location_manual: formData.locationManual,
        comments: formData.comments,
        collector_name: collector.name,
        collector_phone: collector.phone,
      };
      const { error } = await supabase.from('outreach_records').insert([payload]);
      if (error) { showToast('Error: ' + error.message, 'error'); }
      else {
        showToast('Record saved! Ready for the next person.');
        setFormData(INITIAL_FORM_DATA);
      }
    } catch (err) {
      console.error(err);
      showToast('Network error. Please check your connection.', 'error');
    } finally { setIsSubmitting(false); }
  };

  /* ── Render splash ── */
  if (!splashDone) return <SplashScreen hiding={splashHiding} />;

  /* ── Oath screen ── */
  if (!hasTakenOath) {
    return (
      <div className="container">
        <Toast toast={toast} onClose={() => setToast(null)} />
        {/* Oath header */}
        <div className="header" style={{ justifyContent: 'center', borderColor: 'rgba(255,160,0,0.18)' }}>
          <div className="header-logo-wrapper">
            <img src="/fmc-logo.png" alt="FMC" className="header-logo" />
          </div>
          <div className="header-text">
            <h1>Faith Miracle Crusade</h1>
            <p>Outreach Data Portal</p>
          </div>
        </div>

        <div className="form-card oath-card">
          <h2 className="form-title text-center" style={{ justifyContent: 'center' }}>
            Collector Registration
          </h2>
          <p className="form-help-text text-center" style={{ marginBottom: '1.5rem' }}>
            Identify yourself and take the accuracy oath to begin collecting data.
          </p>

          <form onSubmit={handleOathSubmit} className="form-section">
            {/* Name */}
            <div className="form-group">
              <label className="form-label">
                <UserCircle weight="fill" size={16} className="form-label-icon" />
                Your Full Name <span className="optional">*</span>
              </label>
              <div className="form-input-wrapper">
                <User className="form-input-icon" size={16} weight="bold" />
                <input
                  type="text" name="name" className="form-input has-icon"
                  placeholder="e.g. John Doe" required
                  value={collector.name} onChange={handleCollectorChange}
                />
              </div>
            </div>

            {/* Phone */}
            <div className="form-group">
              <label className="form-label">
                <Phone weight="fill" size={16} className="form-label-icon" /> Your Phone Number <span className="optional">*</span>
              </label>
              <div className="form-input-wrapper">
                <Phone className="form-input-icon" size={16} weight="bold" />
                <input
                  type="tel" name="phone" className="form-input has-icon"
                  placeholder="e.g. 0244123456" required
                  value={collector.phone} onChange={handleCollectorChange}
                />
              </div>
            </div>

            {/* Oath checkbox */}
            <label
              className={`checkbox-group${collector.accepted ? ' checked' : ''}`}
              style={{ marginTop: '0.25rem' }}
            >
              <input
                type="checkbox" name="accepted" className="checkbox-input"
                checked={collector.accepted} onChange={handleCollectorChange} required
              />
              <div className="checkbox-label">
                <span className="checkbox-label-title">
                  <ShieldCheck size={17} color="var(--color-yellow)" weight="fill" />
                  Data Accuracy Oath
                </span>
                <span className="checkbox-label-desc">
                  I solemnly swear to record and submit only accurate, truthful, and verified
                  information provided directly by the individuals I engage during this outreach.
                </span>
              </div>
            </label>

            <button type="submit" className="submit-btn" disabled={!collector.accepted}>
              Accept &amp; Start Collecting
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ── Main form ── */
  return (
    <div className="container">
      <Toast toast={toast} onClose={() => setToast(null)} />
      {/* Header */}
      <div className="header">
        <div className="header-logo-wrapper">
          <img src="/image.png" alt="FMC" className="header-logo" />
        </div>
        <div className="header-text">
          <h1>Faith Miracle Crusade</h1>
          <p>
            Outreach Form&nbsp;&rarr;&nbsp;
            <span className="header-badge">
              <UserCircle size={13} weight="fill" />
              {collector.name}
            </span>
          </p>
        </div>
        <button
          className="logout-btn"
          onClick={() => {
            if (window.confirm('Log out as collector?')) {
              localStorage.removeItem('fmc_collector');
              setHasTakenOath(false);
            }
          }}
        >
          <SignOut size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} weight="bold" />
          Logout
        </button>
      </div>

      {/* Form card */}
      <div className="form-card">
        <form onSubmit={handleSubmit} className="form-section">
          <h2 className="form-title">Details</h2>

          {/* Search existing */}
          <div className="form-group relative-search">
            <label className="form-label">
              <MagnifyingGlass size={15} weight="bold" className="form-label-icon" />
              Search Existing Record
            </label>
            <div className="form-input-wrapper">
              <MagnifyingGlass className="form-input-icon" size={16} weight="bold" />
              <input
                type="text" className="form-input has-icon"
                placeholder="Search by name or phone to update..."
                value={searchTerm} onChange={handleSearchChange}
              />
            </div>
            {searchResults.length > 0 && (
              <div className="search-dropdown">
                {searchResults.map(p => (
                  <div key={p.id} className="search-item" onClick={() => selectPerson(p)}>
                    <User size={13} weight="bold" />
                    {p.first_name} {p.last_name} — {p.phone}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-divider" />

          {/* Name */}
          <div className="form-group">
            <label className="form-label">
              <User size={15} weight="fill" className="form-label-icon" />
              Full Name <span className="optional">* required</span>
            </label>
            <div className="split-fields">
              <div className="form-input-wrapper">
                <User className="form-input-icon" size={15} weight="bold" />
                <input
                  type="text" name="firstName" className="form-input has-icon"
                  placeholder="First Name *" required
                  value={formData.firstName} onChange={handleChange}
                />
              </div>
              <div className="form-input-wrapper">
                <input
                  type="text" name="lastName" className="form-input"
                  placeholder="Last Name *" required
                  value={formData.lastName} onChange={handleChange}
                />
              </div>
            </div>
            <div className="form-input-wrapper">
              <input
                type="text" name="otherNames" className="form-input"
                placeholder="Other / Middle Names (optional)"
                value={formData.otherNames} onChange={handleChange}
              />
            </div>
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label">
              <Phone size={15} weight="fill" className="form-label-icon" />
              Phone Number <span className="optional">* required</span>
            </label>
            <div className="form-input-wrapper">
              <Phone className="form-input-icon" size={15} weight="bold" />
              <input
                type="tel" name="phone" className="form-input has-icon"
                placeholder="0244 123 456 or +233…" required
                value={formData.phone} onChange={handleChange}
              />
            </div>
          </div>

          {/* Alt Phone */}
          <div className="form-group">
            <label className="form-label">
              <Phone size={15} weight="fill" className="form-label-icon" />
              Alternative Number <span className="optional">(optional)</span>
            </label>
            <div className="form-input-wrapper">
              <Phone className="form-input-icon" size={15} weight="bold" />
              <input
                type="tel" name="altPhone" className="form-input has-icon"
                placeholder="Alternative phone number"
                value={formData.altPhone} onChange={handleChange}
              />
            </div>
          </div>

          {/* Location */}
          <div className="form-group">
            <label className="form-label">
              <MapPin size={15} weight="fill" className="form-label-icon" />
              Location <span className="optional">* required</span>
            </label>
            <div className="split-fields">
              <div className="form-input-wrapper">
                <MapPin className="form-input-icon" size={15} weight="bold" />
                <input
                  type="text" name="locationSearch" className="form-input has-icon"
                  placeholder="Area / Town *" required
                  value={formData.locationSearch} onChange={handleChange}
                />
              </div>
              <div className="form-input-wrapper">
                <input
                  type="text" name="locationManual" className="form-input"
                  placeholder="Street / Landmark (opt.)"
                  value={formData.locationManual} onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="form-group">
            <label className="form-label">
              <ClipboardText size={15} weight="fill" className="form-label-icon" />
              Comments <span className="optional">(optional)</span>
            </label>
            <div className="form-input-wrapper">
              <ClipboardText className="form-input-icon" size={15} weight="bold" />
              <input
                type="text" name="comments" className="form-input has-icon"
                placeholder="Any relevant observations…"
                value={formData.comments} onChange={handleChange}
              />
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : '✦  Submit Outreach Record'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
