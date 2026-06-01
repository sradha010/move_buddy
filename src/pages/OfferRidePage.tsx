import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, MapPin, ArrowRight, Check, DollarSign, Calendar,
  AlertCircle, CheckCircle, Shield, Upload, FileText,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { useNavigate } from 'react-router-dom';
import ExpenseCalculator from '../components/ExpenseCalculator';
import type { PlaceData } from '../components/base/GooglePlacesInput';

interface GuestRequest {
  id: string;
  name: string;
  rating: number;
  pickupPoint: string;
  dropPoint: string;
  overlap: number;
  status: 'pending' | 'accepted' | 'declined';
}

const sampleGuests: GuestRequest[] = [
  { id: '1', name: 'Arjun Mehta',  rating: 4.6, pickupPoint: 'HSR Layout',  dropPoint: 'Marathahalli',    overlap: 85, status: 'pending' },
  { id: '2', name: 'Sneha Kumar',  rating: 4.8, pickupPoint: 'Koramangala', dropPoint: 'Whitefield',      overlap: 72, status: 'pending' },
  { id: '3', name: 'Rohit Das',    rating: 4.5, pickupPoint: 'Indiranagar', dropPoint: 'Electronic City', overlap: 65, status: 'pending' },
];

// ─── Document Verification Step ──────────────────────────────

function DocumentVerification({ onVerified }: { onVerified: () => void }) {
  const [licenseNumber, setLicenseNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber]   = useState('');
  const [licenseFile, setLicenseFile]       = useState<File | null>(null);
  const [aadhaarFile, setAadhaarFile]       = useState<File | null>(null);
  const [verifying, setVerifying]           = useState(false);
  const [error, setError]                   = useState('');

  const handleSubmit = () => {
    setError('');
    if (licenseNumber.trim().length < 8) {
      setError('Enter a valid driving licence number (min 8 characters).');
      return;
    }
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      setError('Aadhaar number must be exactly 12 digits.');
      return;
    }
    if (!licenseFile) {
      setError('Please upload a photo/scan of your driving licence.');
      return;
    }
    if (!aadhaarFile) {
      setError('Please upload a photo/scan of your Aadhaar card.');
      return;
    }

    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      localStorage.setItem('buddyride_verified', 'true');
      onVerified();
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto"
    >
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-syne font-bold text-2xl text-gray-900">Verify Your Identity</h2>
          <p className="text-gray-500 text-sm mt-1">
            Submit your documents to start offering rides on BuddyRide
          </p>
        </div>

        <div className="border-t border-gray-200" />

        {/* Step 1 — Driving Licence */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-primary rounded-full text-text-dark text-xs font-bold flex items-center justify-center shrink-0">
              1
            </span>
            Driving Licence
          </h3>

          <input
            type="text"
            placeholder="Licence number  e.g. KA0120230001234"
            value={licenseNumber}
            onChange={e => setLicenseNumber(e.target.value.toUpperCase())}
            className="w-full bg-gray-50 text-gray-900 rounded-lg py-3 px-4 border-2 border-gray-200 focus:outline-none focus:border-primary transition-all duration-300 font-mono tracking-wide"
          />

          <label className="flex flex-col items-center gap-2 w-full border-2 border-dashed border-gray-200 rounded-xl p-5 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all text-center">
            {licenseFile ? (
              <>
                <FileText className="w-6 h-6 text-primary" />
                <span className="text-sm text-primary font-medium">{licenseFile.name}</span>
                <span className="text-xs text-gray-400">Click to change</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-gray-400" />
                <span className="text-sm text-gray-500">Upload licence photo / scan</span>
                <span className="text-xs text-gray-400">JPG, PNG or PDF · max 5 MB</span>
              </>
            )}
            <input
              type="file"
              className="hidden"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={e => setLicenseFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="border-t border-gray-200" />

        {/* Step 2 — Aadhaar Card */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-primary rounded-full text-text-dark text-xs font-bold flex items-center justify-center shrink-0">
              2
            </span>
            Aadhaar Card
          </h3>

          <input
            type="text"
            inputMode="numeric"
            placeholder="12-digit Aadhaar number"
            value={aadhaarNumber}
            onChange={e => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
            className="w-full bg-gray-50 text-gray-900 rounded-lg py-3 px-4 border-2 border-gray-200 focus:outline-none focus:border-primary transition-all duration-300 font-mono tracking-[0.25em]"
            maxLength={12}
          />

          <label className="flex flex-col items-center gap-2 w-full border-2 border-dashed border-gray-200 rounded-xl p-5 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all text-center">
            {aadhaarFile ? (
              <>
                <FileText className="w-6 h-6 text-primary" />
                <span className="text-sm text-primary font-medium">{aadhaarFile.name}</span>
                <span className="text-xs text-gray-400">Click to change</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-gray-400" />
                <span className="text-sm text-gray-500">Upload Aadhaar photo / scan</span>
                <span className="text-xs text-gray-400">JPG, PNG or PDF · max 5 MB</span>
              </>
            )}
            <input
              type="file"
              className="hidden"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={e => setAadhaarFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg p-3 border border-red-500/20"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.button
          onClick={handleSubmit}
          disabled={verifying}
          whileHover={{ scale: verifying ? 1 : 1.02 }}
          whileTap={{ scale: 0.97 }}
          className={`w-full py-4 rounded-full font-semibold flex items-center justify-center gap-2 transition-all ${
            verifying
              ? 'bg-primary/40 text-primary/60 cursor-not-allowed'
              : 'bg-primary text-text-dark hover:shadow-lg hover:shadow-primary/40'
          }`}
        >
          {verifying ? (
            <>
              <div className="w-5 h-5 border-2 border-text-dark/40 border-t-text-dark rounded-full animate-spin" />
              Verifying documents…
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" />
              Submit for Verification
            </>
          )}
        </motion.button>

        <p className="text-center text-xs text-gray-400">
          🔒 Your documents are encrypted and used only for identity verification.
        </p>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function OfferRidePage() {
  const { user, isAuthenticated } = useApp();
  const navigate = useNavigate();

  const [isVerified, setIsVerified] = useState(
    () => localStorage.getItem('buddyride_verified') === 'true'
  );
  const [departureTime, setDepartureTime] = useState('08:30');
  const [pricePerKm, setPricePerKm]       = useState(6);
  const [posting, setPosting]             = useState(false);
  const [showGuests, setShowGuests]       = useState(false);
  const [successToast, setSuccessToast]   = useState(false);
  const [guests, setGuests]               = useState<GuestRequest[]>(sampleGuests);
  const [routeData, setRouteData]         = useState<{
    origin: PlaceData | null;
    destination: PlaceData | null;
    distanceKm: number;
    fare: number;
  } | null>(null);

  const handleRouteChange = useCallback((data: any) => {
    setRouteData(data);
  }, []);

  const handlePostRide = () => {
    if (!isAuthenticated) {
      navigate('/auth/login');
      return;
    }
    if (!routeData?.origin || !routeData?.destination) return;
    setPosting(true);
    setTimeout(() => {
      setPosting(false);
      setShowGuests(true);
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 4000);
    }, 1500);
  };

  const handleAccept  = (id: string) => setGuests(g => g.map(x => x.id === id ? { ...x, status: 'accepted' } : x));
  const handleDecline = (id: string) => setGuests(g => g.map(x => x.id === id ? { ...x, status: 'declined' } : x));

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const perTripEarning = routeData ? Math.round(pricePerKm * routeData.distanceKm) : 0;
  const monthlyEarning = perTripEarning * 40;

  return (
    <div className="min-h-screen bg-bg pt-20 pb-12">

      {/* ── Success Toast ─────────────────────────────────────── */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-green-500 text-white px-6 py-3.5 rounded-full shadow-2xl shadow-green-500/30"
          >
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="font-semibold text-sm">Ride posted successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-4">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="text-muted text-sm">{greeting()}, {user?.name || 'Driver'}</p>
          <h1 className="font-syne font-bold text-4xl text-text-light">Offer a Ride</h1>
          <p className="text-muted mt-2">Share your commute and earn on every trip</p>
        </motion.div>

        {/* ── Document Verification Gate ───────────────────────── */}
        {isAuthenticated && !isVerified ? (
          <DocumentVerification onVerified={() => setIsVerified(true)} />
        ) : (
          <>
            {/* Two-column layout */}
            <div className="grid lg:grid-cols-3 gap-8">

              {/* Left: Expense Calculator (2 cols) */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-2"
              >
                <ExpenseCalculator mode="host" showPlans={false} onRouteChange={handleRouteChange} />
              </motion.div>

              {/* Right: Ride Config */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-5"
              >
                {routeData && routeData.distanceKm > 0 ? (
                  <div className="card space-y-4">
                    <h3 className="font-syne font-semibold text-lg text-text-dark">Route Summary</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-100 rounded-lg">
                        <p className="text-xs text-muted mb-1">Distance</p>
                        <p className="font-syne font-bold text-xl text-primary">{routeData.distanceKm} km</p>
                      </div>
                      <div className="p-3 bg-gray-100 rounded-lg">
                        <p className="text-xs text-muted mb-1">Per Trip</p>
                        <p className="font-syne font-bold text-xl text-teal">₹{perTripEarning}</p>
                      </div>
                    </div>
                    <div className="border-t border-teal/20" />
                    <div>
                      <label className="block text-sm font-medium text-text-dark mb-2">
                        <Clock className="w-4 h-4 inline mr-2" />
                        Departure Time
                      </label>
                      <input
                        type="time"
                        value={departureTime}
                        onChange={e => setDepartureTime(e.target.value)}
                        className="input-filled w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-dark mb-2">
                        <DollarSign className="w-4 h-4 inline mr-2" />
                        Price per km (₹)
                      </label>
                      <input
                        type="number"
                        value={pricePerKm}
                        onChange={e => setPricePerKm(parseInt(e.target.value) || 0)}
                        className="input-filled w-full font-mono"
                        min={3}
                        max={50}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="card text-center py-12">
                    <MapPin className="w-12 h-12 text-muted/30 mx-auto mb-3" />
                    <p className="text-muted text-sm">Set a route to configure your ride</p>
                  </div>
                )}

                {/* Earnings + Post button */}
                {routeData && routeData.distanceKm > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card bg-gradient-to-br from-teal to-teal/80 text-text-light space-y-4"
                  >
                    <h3 className="font-syne font-semibold text-lg">Earnings Estimate</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1.5">
                        <span className="text-text-light/70">Rate</span>
                        <span className="font-mono font-semibold">₹{pricePerKm}/km</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-text-light/70">Per trip</span>
                        <span className="font-mono font-semibold text-primary">₹{perTripEarning}</span>
                      </div>
                      <div className="border-t border-text-light/20" />
                      <div className="flex justify-between py-1.5">
                        <span className="text-text-light/70">Monthly (40 trips)</span>
                        <span className="font-syne font-bold text-xl text-primary">₹{monthlyEarning}</span>
                      </div>
                    </div>

                    <motion.button
                      onClick={handlePostRide}
                      disabled={posting}
                      whileHover={{ scale: posting ? 1 : 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className={`w-full py-4 rounded-full font-semibold flex items-center justify-center gap-2 transition-all ${
                        !posting
                          ? 'bg-primary text-text-dark hover:shadow-lg hover:shadow-primary/40'
                          : 'bg-primary/40 text-primary/60 cursor-not-allowed'
                      }`}
                    >
                      {posting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-text-dark border-t-transparent rounded-full animate-spin" />
                          Posting…
                        </>
                      ) : (
                        <>
                          <Calendar className="w-4 h-4" />
                          {isAuthenticated ? 'Post Ride' : 'Login to Post Ride'}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </motion.button>

                    {!isAuthenticated && (
                      <p className="text-center text-xs text-text-light/50">
                        You'll be redirected to login &amp; can post after
                      </p>
                    )}
                  </motion.div>
                )}
              </motion.div>
            </div>

            {/* ── Matched Passengers ───────────────────────────── */}
            {showGuests && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-14">
                <div className="mb-6">
                  <h2 className="font-syne font-bold text-3xl text-text-light mb-1">Matched Passengers</h2>
                  <p className="text-muted">Review and accept ride requests</p>
                </div>

                <div className="space-y-4">
                  {guests.filter(g => g.status !== 'declined').map((guest, index) => (
                    <motion.div
                      key={guest.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`card border-l-4 ${guest.status === 'accepted' ? 'border-l-primary bg-primary/5' : 'border-l-teal'}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="font-syne font-bold text-primary text-lg">{guest.name[0]}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-text-dark">{guest.name}</h3>
                            <p className="text-sm text-muted"><span className="text-primary">★</span> {guest.rating}</p>
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5 text-sm">
                            <span className="text-text-light font-medium">{guest.pickupPoint}</span>
                            <ArrowRight className="w-4 h-4 text-teal" />
                            <span className="text-text-light font-medium">{guest.dropPoint}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${guest.overlap}%` }}
                                transition={{ duration: 0.5 }}
                                className="h-full bg-primary rounded-full"
                              />
                            </div>
                            <span className="text-xs font-semibold text-primary">{guest.overlap}% match</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {guest.status === 'pending' && (
                            <>
                              <motion.button onClick={() => handleAccept(guest.id)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-primary px-5 py-2 text-sm flex items-center gap-1.5">
                                <Check className="w-4 h-4" /> Accept
                              </motion.button>
                              <motion.button onClick={() => handleDecline(guest.id)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-5 py-2 rounded-full border-2 border-muted text-muted hover:bg-muted/10 transition-all text-sm font-medium">
                                Decline
                              </motion.button>
                            </>
                          )}
                          {guest.status === 'accepted' && (
                            <span className="px-5 py-2 bg-primary/10 text-primary rounded-full font-medium text-sm flex items-center gap-1.5">
                              <Check className="w-4 h-4" /> Confirmed
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {guests.every(g => g.status === 'declined') && (
                    <div className="card text-center py-10 bg-amber-500/10 border border-amber-500/20">
                      <AlertCircle className="w-10 h-10 text-amber-500/50 mx-auto mb-2" />
                      <p className="text-amber-600 font-medium">No pending requests</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
