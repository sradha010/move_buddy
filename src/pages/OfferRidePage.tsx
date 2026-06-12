import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, MapPin, ArrowRight, Check, IndianRupee, Calendar,
  AlertCircle, CheckCircle, Shield, Upload, FileText, X,
  Users, TrendingUp, Star, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import ExpenseCalculator from '../components/ExpenseCalculator';
import type { PlaceData } from '../components/base/GooglePlacesInput';

// ─── Constants ────────────────────────────────────────────────

const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:3000/api/v1';

const SPRING = { type: 'spring', stiffness: 300, damping: 25 } as const;

// ─── Types ────────────────────────────────────────────────────

interface DocumentStatus {
  status: 'pending' | 'approved' | 'rejected';
}

interface RideRequest {
  id: string;
  rider?: {
    id: string;
    name?: string;
    rating?: number;
  };
  pickup_address?: string;
  dropoff_address?: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface Ride {
  id: string;
  status: string;
  requests?: RideRequest[];
}

interface RouteData {
  origin: PlaceData | null;
  destination: PlaceData | null;
  distanceKm: number;
  durationMinutes: number;
  fare: number;
}

// ─── Animated Spinner ─────────────────────────────────────────

function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <div
      className={`${className} border-2 border-current border-t-transparent rounded-full animate-spin opacity-70`}
    />
  );
}

// ─── File Upload Zone ─────────────────────────────────────────

function FileUploadZone({
  file,
  onChange,
  label,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onChange(f);
  };

  return (
    <motion.label
      whileHover={{ scale: 1.01 }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      className="flex flex-col items-center gap-2 w-full border-2 border-dashed border-white/10 hover:border-primary/50 rounded-xl p-5 cursor-pointer hover:bg-primary/5 transition-all text-center"
      onClick={() => inputRef.current?.click()}
    >
      {file ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING}
          className="flex flex-col items-center gap-1.5"
        >
          <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center">
            <FileText className="w-5 h-5 text-green-400" />
          </div>
          <span className="text-sm text-green-400 font-medium max-w-[200px] truncate">{file.name}</span>
          <span className="text-xs text-muted">Click to change</span>
        </motion.div>
      ) : (
        <>
          <Upload className="w-6 h-6 text-muted" />
          <span className="text-sm text-muted">{label}</span>
          <span className="text-xs text-muted/60">JPG, PNG or PDF · max 5 MB</span>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={e => onChange(e.target.files?.[0] ?? null)}
      />
    </motion.label>
  );
}

// ─── Document Verification Component ─────────────────────────

function DocumentVerification({ onSubmitted }: { onSubmitted: () => void }) {
  const [licenseNumber, setLicenseNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const validate = (): string => {
    if (licenseNumber.trim().length < 8) return 'Enter a valid driving licence number (min 8 characters).';
    if (!/^\d{12}$/.test(aadhaarNumber)) return 'Aadhaar number must be exactly 12 digits.';
    if (!licenseFile) return 'Please upload a photo/scan of your driving licence.';
    if (!aadhaarFile) return 'Please upload a photo/scan of your Aadhaar card.';
    return '';
  };

  const uploadDoc = async (type: string, file: File) => {
    const token = localStorage.getItem('buddyride_token');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/documents/upload/${type}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token ?? ''}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err?.message ?? `Upload failed: ${res.status}`);
    }
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError('');
    setSubmitting(true);
    try {
      await uploadDoc('driving_license', licenseFile!);
      await uploadDoc('aadhaar', aadhaarFile!);
      setDone(true);
      setTimeout(onSubmitted, 2500);
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={SPRING}
        className="max-w-lg mx-auto"
      >
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...SPRING, delay: 0.1 }}
            className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto"
          >
            <CheckCircle className="w-8 h-8 text-green-400" />
          </motion.div>
          <h2 className="font-syne font-bold text-2xl text-text-light">Submitted!</h2>
          <p className="text-muted">Your documents are under review. You'll be notified within 24 hours.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      className="max-w-lg mx-auto"
    >
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="relative w-20 h-20 mx-auto">
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.3, 0.5] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full bg-primary/30"
            />
            <div className="relative w-20 h-20 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Shield className="w-9 h-9 text-primary" />
            </div>
          </div>
          <div>
            <h2 className="font-syne font-bold text-2xl text-text-light">Verify Your Identity</h2>
            <p className="text-muted text-sm mt-1">Submit your documents to start offering rides</p>
          </div>
        </div>

        <div className="border-t border-white/[0.08]" />

        {/* Step 1 — Driving Licence */}
        <div className="space-y-3">
          <h3 className="font-semibold text-text-light flex items-center gap-2 text-sm">
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
            className="w-full bg-white/[0.05] text-text-light rounded-xl py-3 px-4 border border-white/[0.08] focus:outline-none focus:border-primary/60 transition-all font-mono tracking-wide placeholder:text-muted/40 text-sm"
          />
          <FileUploadZone
            file={licenseFile}
            onChange={setLicenseFile}
            label="Upload licence photo / scan"
          />
        </div>

        <div className="border-t border-white/[0.08]" />

        {/* Step 2 — Aadhaar Card */}
        <div className="space-y-3">
          <h3 className="font-semibold text-text-light flex items-center gap-2 text-sm">
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
            maxLength={12}
            className="w-full bg-white/[0.05] text-text-light rounded-xl py-3 px-4 border border-white/[0.08] focus:outline-none focus:border-primary/60 transition-all font-mono tracking-[0.25em] placeholder:text-muted/40 text-sm"
          />
          <FileUploadZone
            file={aadhaarFile}
            onChange={setAadhaarFile}
            label="Upload Aadhaar photo / scan"
          />
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl p-3 border border-red-500/20 overflow-hidden"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.button
          onClick={handleSubmit}
          disabled={submitting}
          whileHover={{ scale: submitting ? 1 : 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
          className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            submitting
              ? 'bg-primary/30 text-primary/50 cursor-not-allowed'
              : 'bg-primary text-text-dark hover:shadow-lg hover:shadow-primary/25'
          }`}
        >
          {submitting ? (
            <>
              <Spinner />
              Uploading documents…
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" />
              Submit for Verification
            </>
          )}
        </motion.button>

        <p className="text-center text-xs text-muted/60">
          Your documents are encrypted and used only for identity verification.
        </p>
      </div>
    </motion.div>
  );
}

// ─── Document Pending Screen ──────────────────────────────────

function DocumentPending() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      className="max-w-lg mx-auto"
    >
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-10 text-center space-y-5">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center mx-auto"
        >
          <Clock className="w-9 h-9 text-yellow-400" />
        </motion.div>
        <div>
          <h2 className="font-syne font-bold text-2xl text-text-light">Documents Under Review</h2>
          <p className="text-muted mt-2 text-sm leading-relaxed">
            Our team will verify your documents within 24 hours.
            <br />
            You'll be notified once approved.
          </p>
        </div>
        <div className="flex items-center gap-3 justify-center text-xs text-muted/60 bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
          <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
          Documents received — verification in progress
        </div>
      </div>
    </motion.div>
  );
}

// ─── Request Card ─────────────────────────────────────────────

function RequestCard({
  req,
  rideId,
  onUpdate,
  index,
}: {
  req: RideRequest;
  rideId: string;
  onUpdate: () => void;
  index: number;
}) {
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null);

  const guestName = req.rider?.name ?? 'Passenger';
  const guestRating = req.rider?.rating ?? null;
  const pickup = req.pickup_address ?? 'Pickup point';
  const dropoff = req.dropoff_address ?? 'Dropoff point';

  const handleAction = async (action: 'accept' | 'reject') => {
    setLoading(action);
    try {
      await api.patch(`/rides/${rideId}/requests/${req.id}/${action === 'accept' ? 'accept' : 'reject'}`);
      onUpdate();
    } catch {
      // silently ignore, parent refresh will handle state
    } finally {
      setLoading(null);
    }
  };

  const isAccepted = req.status === 'accepted';
  const isRejected = req.status === 'rejected';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ ...SPRING, delay: index * 0.08 }}
      className={`bg-white/[0.03] backdrop-blur-xl border rounded-2xl p-5 transition-all ${
        isAccepted
          ? 'border-primary/40 bg-primary/5'
          : isRejected
          ? 'border-white/[0.04] opacity-50'
          : 'border-white/[0.08]'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Avatar + name */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="font-syne font-bold text-primary text-lg">
              {guestName[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-text-light text-sm">{guestName}</p>
            {guestRating !== null ? (
              <p className="text-xs text-muted flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                {guestRating.toFixed(1)}
              </p>
            ) : (
              <p className="text-xs text-muted/40">No rating yet</p>
            )}
          </div>
        </div>

        {/* Route + overlap bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 text-xs">
            <span className="text-text-light/80 truncate max-w-[120px]">{pickup}</span>
            <ArrowRight className="w-3 h-3 text-teal shrink-0" />
            <span className="text-text-light/80 truncate max-w-[120px]">{dropoff}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '75%' }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="h-full bg-primary/70 rounded-full"
              />
            </div>
            <span className="text-xs font-semibold text-primary/80 shrink-0">Route match</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {req.status === 'pending' && (
            <>
              <motion.button
                onClick={() => handleAction('accept')}
                disabled={loading !== null}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={SPRING}
                className="px-4 py-2 bg-primary text-text-dark rounded-xl font-semibold text-sm flex items-center gap-1.5 hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'accept' ? <Spinner className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                Accept
              </motion.button>
              <motion.button
                onClick={() => handleAction('reject')}
                disabled={loading !== null}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={SPRING}
                className="px-4 py-2 rounded-xl border border-white/[0.12] text-muted hover:bg-white/[0.05] transition-all text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'reject' ? <Spinner className="w-4 h-4" /> : <X className="w-4 h-4" />}
                Decline
              </motion.button>
            </>
          )}
          {isAccepted && (
            <span className="px-4 py-2 bg-primary/15 text-primary rounded-xl font-medium text-sm flex items-center gap-1.5 border border-primary/20">
              <Check className="w-4 h-4" /> Confirmed
            </span>
          )}
          {isRejected && (
            <span className="px-4 py-2 bg-white/[0.04] text-muted rounded-xl text-sm border border-white/[0.06]">
              Declined
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Matched Requests Panel ───────────────────────────────────

function MatchedRequests({ rideId }: { rideId: string }) {
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const fetchRequests = useCallback(async () => {
    try {
      const rides = await api.get<Ride[]>('/rides/my');
      const activeRide = Array.isArray(rides)
        ? rides.find(r => r.id === rideId) ?? rides[rides.length - 1]
        : null;
      if (activeRide?.requests) {
        setRequests(activeRide.requests);
      }
    } catch {
      // keep existing state
    } finally {
      setLoading(false);
    }
  }, [rideId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.15 }}
      className="mt-12"
    >
      {/* Section header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between mb-5 group"
      >
        <div>
          <h2 className="font-syne font-bold text-2xl text-text-light text-left">Matched Passengers</h2>
          <p className="text-muted text-sm mt-0.5">
            {loading ? 'Loading requests…' : `${requests.length} request${requests.length !== 1 ? 's' : ''} · ${pendingCount} pending`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="px-2.5 py-1 bg-primary/20 text-primary rounded-full text-xs font-bold border border-primary/30">
              {pendingCount} new
            </span>
          )}
          <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-muted group-hover:border-white/20 transition-all">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Spinner className="w-7 h-7 text-primary" />
              </div>
            )}

            {!loading && requests.length === 0 && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-10 text-center">
                <Users className="w-10 h-10 text-muted/30 mx-auto mb-3" />
                <p className="text-muted text-sm">No requests yet. Passengers will appear here soon.</p>
              </div>
            )}

            {!loading && requests.length > 0 && (
              <AnimatePresence>
                {requests.filter(r => r.status !== 'rejected').map((req, idx) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    rideId={rideId}
                    onUpdate={fetchRequests}
                    index={idx}
                  />
                ))}
              </AnimatePresence>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Ride Config Panel ────────────────────────────────────────

function RideConfigPanel({
  routeData,
  onPosted,
}: {
  routeData: RouteData | null;
  onPosted: (rideId: string) => void;
}) {
  const { isAuthenticated } = useApp();
  const navigate = useNavigate();
  const [departureTime, setDepartureTime] = useState('08:30');
  const [pricePerKm, setPricePerKm] = useState(6);
  const [totalSeats, setTotalSeats] = useState(2);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const hasRoute = routeData && routeData.distanceKm > 0;
  const perTripEarning = hasRoute ? Math.round(pricePerKm * routeData.distanceKm) : 0;
  const monthlyEarning = perTripEarning * 40;

  const handlePostRide = async () => {
    if (!isAuthenticated) { navigate('/auth/login'); return; }
    if (!hasRoute) return;

    setError('');
    setPosting(true);

    try {
      const now = new Date();
      const [hours, minutes] = departureTime.split(':').map(Number);
      const departure = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);

      const body = {
        origin_address: routeData.origin?.address ?? '',
        origin_lat: routeData.origin?.lat ?? 0,
        origin_lng: routeData.origin?.lng ?? 0,
        destination_address: routeData.destination?.address ?? '',
        destination_lat: routeData.destination?.lat ?? 0,
        destination_lng: routeData.destination?.lng ?? 0,
        distance_km: routeData.distanceKm,
        duration_minutes: routeData.durationMinutes,
        departure_time: departure.toISOString(),
        price_per_km: pricePerKm,
        total_seats: totalSeats,
      };

      const response = await api.post<{ id: string } | Ride>('/rides/offer', body);
      const postedRideId = (response as any)?.id ?? (response as any)?.data?.id ?? '';
      onPosted(postedRideId);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to post ride. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  if (!hasRoute) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={SPRING}
        className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 text-center"
      >
        <MapPin className="w-12 h-12 text-muted/30 mx-auto mb-3" />
        <p className="text-muted text-sm">Set a route to configure your ride</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={SPRING}
      className="space-y-4"
    >
      {/* Route Summary */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 space-y-4">
        <h3 className="font-syne font-semibold text-base text-text-light">Route Summary</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.06]">
            <p className="text-xs text-muted mb-1">Distance</p>
            <p className="font-syne font-bold text-xl text-primary">{routeData.distanceKm} km</p>
          </div>
          <div className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.06]">
            <p className="text-xs text-muted mb-1">Duration</p>
            <p className="font-syne font-bold text-xl text-teal">
              {routeData.durationMinutes < 60
                ? `${routeData.durationMinutes}m`
                : `${Math.floor(routeData.durationMinutes / 60)}h ${routeData.durationMinutes % 60}m`}
            </p>
          </div>
        </div>

        <div className="border-t border-white/[0.08]" />

        {/* Departure time */}
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-muted mb-2">
            <Clock className="w-3.5 h-3.5" /> Departure Time
          </label>
          <input
            type="time"
            value={departureTime}
            onChange={e => setDepartureTime(e.target.value)}
            className="w-full bg-white/[0.05] text-text-light rounded-xl py-3 px-4 border border-white/[0.08] focus:outline-none focus:border-primary/60 transition-all text-sm font-mono"
          />
        </div>

        {/* Price per km */}
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-muted mb-2">
            <IndianRupee className="w-3.5 h-3.5" /> Price per km (₹)
          </label>
          <input
            type="number"
            value={pricePerKm}
            onChange={e => setPricePerKm(Math.max(3, Math.min(50, parseInt(e.target.value) || 3)))}
            min={3}
            max={50}
            className="w-full bg-white/[0.05] text-text-light rounded-xl py-3 px-4 border border-white/[0.08] focus:outline-none focus:border-primary/60 transition-all text-sm font-mono"
          />
        </div>

        {/* Total seats */}
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-muted mb-2">
            <Users className="w-3.5 h-3.5" /> Total Seats
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <motion.button
                key={n}
                onClick={() => setTotalSeats(n)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={SPRING}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                  totalSeats === n
                    ? 'bg-primary text-text-dark border-primary'
                    : 'bg-white/[0.04] text-muted border-white/[0.08] hover:border-primary/30'
                }`}
              >
                {n}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Earnings + Post */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING, delay: 0.1 }}
        className="bg-teal/20 backdrop-blur-xl border border-teal/30 rounded-2xl p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-teal" />
          <h3 className="font-syne font-semibold text-base text-text-light">Earnings Estimate</h3>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
            <span className="text-muted">Rate</span>
            <span className="font-mono font-semibold text-text-light">₹{pricePerKm}/km</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-white/[0.06]">
            <span className="text-muted">Per trip</span>
            <span className="font-mono font-semibold text-primary">₹{perTripEarning}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted">Monthly (40 trips)</span>
            <span className="font-syne font-bold text-lg text-primary">₹{monthlyEarning.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 text-red-400 text-xs bg-red-500/10 rounded-xl p-3 border border-red-500/20 overflow-hidden"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={handlePostRide}
          disabled={posting}
          whileHover={{ scale: posting ? 1 : 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
          className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            !posting
              ? 'bg-primary text-text-dark hover:shadow-lg hover:shadow-primary/25'
              : 'bg-primary/30 text-primary/50 cursor-not-allowed'
          }`}
        >
          {posting ? (
            <>
              <Spinner />
              Posting ride…
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
          <p className="text-center text-xs text-muted/60">
            You'll be redirected to login before posting
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

type DocGateState = 'loading' | 'upload' | 'pending' | 'approved';

export default function OfferRidePage() {
  const { user, isAuthenticated } = useApp();
  const navigate = useNavigate();

  const [docGate, setDocGate] = useState<DocGateState>('loading');
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [postedRideId, setPostedRideId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState(false);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login');
    }
  }, [isAuthenticated, navigate]);

  // Fetch document verification status
  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    api.get<DocumentStatus | null>('/documents/status')
      .then(status => {
        if (cancelled) return;
        if (!status) {
          setDocGate('upload');
        } else if (status.status === 'approved') {
          setDocGate('approved');
        } else if (status.status === 'pending') {
          setDocGate('pending');
        } else {
          // rejected or unknown
          setDocGate('upload');
        }
      })
      .catch(() => {
        if (!cancelled) setDocGate('upload');
      });

    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const handleRouteChange = useCallback((data: any) => {
    setRouteData(data);
  }, []);

  const handleRidePosted = (rideId: string) => {
    setPostedRideId(rideId || '__latest__');
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 4500);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-bg pt-20 pb-16">

      {/* Success toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -28, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -28, scale: 0.92 }}
            transition={SPRING}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-green-500 text-white px-6 py-3.5 rounded-full shadow-2xl shadow-green-500/30 whitespace-nowrap"
          >
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="font-semibold text-sm">Ride posted successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-4">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className="mb-10"
        >
          <p className="text-muted text-sm">{greeting()}, {user?.name || 'Driver'}</p>
          <h1 className="font-syne font-bold text-4xl text-text-light mt-0.5">Offer a Ride</h1>
          <p className="text-muted mt-2 text-sm">Share your commute and earn on every trip</p>
        </motion.div>

        {/* Loading state */}
        {docGate === 'loading' && (
          <div className="flex items-center justify-center py-24">
            <Spinner className="w-8 h-8 text-primary" />
          </div>
        )}

        {/* Document upload */}
        {docGate === 'upload' && (
          <DocumentVerification onSubmitted={() => setDocGate('pending')} />
        )}

        {/* Pending */}
        {docGate === 'pending' && <DocumentPending />}

        {/* Approved — main form */}
        {docGate === 'approved' && (
          <>
            <div className="grid lg:grid-cols-3 gap-8">

              {/* Left: Expense Calculator */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...SPRING, delay: 0.05 }}
                className="lg:col-span-2"
              >
                <ExpenseCalculator
                  mode="host"
                  showPlans={false}
                  onRouteChange={handleRouteChange}
                />
              </motion.div>

              {/* Right: Ride config */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...SPRING, delay: 0.1 }}
              >
                <RideConfigPanel routeData={routeData} onPosted={handleRidePosted} />
              </motion.div>
            </div>

            {/* Matched requests panel */}
            <AnimatePresence>
              {postedRideId && (
                <MatchedRequests rideId={postedRideId === '__latest__' ? '' : postedRideId} />
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
