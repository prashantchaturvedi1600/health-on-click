import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Check, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DoctorAvailability } from '../../types';
import { api } from '../../services/api';

const DAYS = [
  { index: 1, name: 'Monday' },
  { index: 2, name: 'Tuesday' },
  { index: 3, name: 'Wednesday' },
  { index: 4, name: 'Thursday' },
  { index: 5, name: 'Friday' },
  { index: 6, name: 'Saturday' },
  { index: 0, name: 'Sunday' },
];

export const DoctorAvailabilityManager: React.FC = () => {
  const [schedule, setSchedule] = useState<
    Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      slotDurationMinutes: number;
      consultationModes: string[];
      isActive: boolean;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await api.getDoctorAvailability();
      const existing = res.availability || [];

      // Ensure all 7 days have an entry
      const fullWeek = DAYS.map(d => {
        const found = existing.find(a => a.dayOfWeek === d.index);
        if (found) {
          return {
            dayOfWeek: found.dayOfWeek,
            startTime: found.startTime,
            endTime: found.endTime,
            slotDurationMinutes: found.slotDurationMinutes || 30,
            consultationModes: found.consultationModes || ['video', 'in_person'],
            isActive: found.isActive,
          };
        }
        return {
          dayOfWeek: d.index,
          startTime: '09:00',
          endTime: '17:00',
          slotDurationMinutes: 30,
          consultationModes: ['video', 'in_person'],
          isActive: d.index >= 1 && d.index <= 5, // Default Mon-Fri active
        };
      });

      setSchedule(fullWeek);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load availability settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateDay = (dayIndex: number, fields: Partial<(typeof schedule)[0]>) => {
    setSchedule(prev =>
      prev.map(item => (item.dayOfWeek === dayIndex ? { ...item, ...fields } : item))
    );
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMsg(null);
      await api.updateDoctorAvailability(schedule);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save availability schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Consultation Availability & Working Hours
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Set your weekly consultation hours. Patients can only book time slots configured here that are not already booked.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="py-2.5 px-5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save Schedule'}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Weekly schedule updated in database successfully! Patient booking slots will reflect these hours.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Week Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading schedule configuration...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {DAYS.map(dayInfo => {
              const dayData = schedule.find(s => s.dayOfWeek === dayInfo.index) || {
                dayOfWeek: dayInfo.index,
                startTime: '09:00',
                endTime: '17:00',
                slotDurationMinutes: 30,
                consultationModes: ['video', 'in_person'],
                isActive: false,
              };

              return (
                <div
                  key={dayInfo.index}
                  className={`py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-opacity ${
                    !dayData.isActive ? 'opacity-60' : 'opacity-100'
                  }`}
                >
                  {/* Day Active Toggle */}
                  <div className="flex items-center gap-3 w-40 shrink-0">
                    <input
                      type="checkbox"
                      id={`day-${dayInfo.index}`}
                      checked={dayData.isActive}
                      onChange={e => updateDay(dayInfo.index, { isActive: e.target.checked })}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
                    />
                    <label
                      htmlFor={`day-${dayInfo.index}`}
                      className="text-sm font-semibold text-slate-800 cursor-pointer"
                    >
                      {dayInfo.name}
                    </label>
                  </div>

                  {/* Hours and Duration Controls */}
                  {dayData.isActive ? (
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      {/* Start Time */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">From</span>
                        <input
                          type="time"
                          value={dayData.startTime}
                          onChange={e => updateDay(dayInfo.index, { startTime: e.target.value })}
                          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                        />
                      </div>

                      {/* End Time */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">To</span>
                        <input
                          type="time"
                          value={dayData.endTime}
                          onChange={e => updateDay(dayInfo.index, { endTime: e.target.value })}
                          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                        />
                      </div>

                      {/* Duration */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Slot:</span>
                        <select
                          value={dayData.slotDurationMinutes}
                          onChange={e => updateDay(dayInfo.index, { slotDurationMinutes: Number(e.target.value) })}
                          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                        >
                          <option value={15}>15 mins</option>
                          <option value={20}>20 mins</option>
                          <option value={30}>30 mins</option>
                          <option value={45}>45 mins</option>
                          <option value={60}>60 mins</option>
                        </select>
                      </div>

                      {/* Modes */}
                      <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                        <label className="flex items-center gap-1 text-[11px] text-slate-600">
                          <input
                            type="checkbox"
                            checked={dayData.consultationModes.includes('video')}
                            onChange={e => {
                              const newModes = e.target.checked
                                ? [...dayData.consultationModes, 'video']
                                : dayData.consultationModes.filter(m => m !== 'video');
                              updateDay(dayInfo.index, { consultationModes: newModes });
                            }}
                          />
                          Video
                        </label>
                        <label className="flex items-center gap-1 text-[11px] text-slate-600">
                          <input
                            type="checkbox"
                            checked={dayData.consultationModes.includes('in_person')}
                            onChange={e => {
                              const newModes = e.target.checked
                                ? [...dayData.consultationModes, 'in_person']
                                : dayData.consultationModes.filter(m => m !== 'in_person');
                              updateDay(dayInfo.index, { consultationModes: newModes });
                            }}
                          />
                          In-Person
                        </label>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Closed / Not Available</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
