import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';

const Activities: React.FC = () => {
  const events = [
    {
      id: '1',
      title: 'Taller de Capacitación',
      start: '2025-04-12T10:00:00',
      end: '2025-04-12T12:00:00',
      backgroundColor: '#4ade80',
      borderColor: '#16a34a',
      textColor: '#000000',
    },
    {
      id: '2',
      title: 'Reunión de Seguimiento',
      start: '2025-04-15T14:00:00',
      end: '2025-04-15T16:00:00',
      backgroundColor: '#60a5fa',
      borderColor: '#2563eb',
      textColor: '#ffffff',
    },
  ];

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">📅 Calendario de Actividades</h1>

        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek',
          }}
          events={events}
          locale={esLocale}
          height="auto"
          eventDisplay="block"
          eventColor="#6366f1"
          eventTextColor="#fff"
        />
      </div>
    </div>
  );
};

export default Activities;