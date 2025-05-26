import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import type { Activity, Agreement, Institution } from '../types';

// Extend the jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    } | undefined;
  }
}

interface DateRange {
  from: Date | null;
  to: Date | null;
}

export const generateActivityReport = (
  activities: (Activity & {
    agreement?: Agreement & { institution?: Institution }
  })[],
  dateRange: DateRange
) => {
  // Create a new PDF document
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text('Reporte de Actividades', 14, 22);

  // Add date information
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);

  let dateText = 'Todas las actividades';
  if (dateRange.from && dateRange.to) {
    const fromFormatted = format(dateRange.from, 'dd/MM/yyyy');
    const toFormatted = format(dateRange.to, 'dd/MM/yyyy');

    if (fromFormatted === toFormatted) {
      dateText = `Fecha: ${fromFormatted}`;
    } else {
      dateText = `Período: ${fromFormatted} - ${toFormatted}`;
    }
  }

  doc.text(dateText, 14, 30);
  doc.text(`Total de actividades: ${activities.length}`, 14, 36);

  // Add generation date
  doc.setFontSize(9);
  doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 42);

  // Current Y position
  let yPos = 50;

  // Add activity status summary
  const completedCount = activities.filter(a => a.status === 'finalizado').length;
  const inProgressCount = activities.filter(a => a.status === 'en_proceso').length;
  const cancelledCount = activities.filter(a => a.status === 'cancelado').length;

  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text('Resumen por Estado', 14, yPos);

  yPos += 8;
  doc.setFontSize(10);
  doc.setTextColor(70, 70, 70);
  doc.text(`• En Proceso: ${inProgressCount}`, 20, yPos);

  yPos += 6;
  doc.text(`• Finalizadas: ${completedCount}`, 20, yPos);

  yPos += 6;
  doc.text(`• Canceladas: ${cancelledCount}`, 20, yPos);

  yPos += 10;

  // Add municipality summary
  const municipalityMap = new Map<string, number>();
  
  activities.forEach(activity => {
    if (activity.municipality) {
      municipalityMap.set(activity.municipality, (municipalityMap.get(activity.municipality) || 0) + 1);
    }
  });
  
  if (municipalityMap.size > 0) {
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Actividades por Municipio', 14, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);
    
    municipalityMap.forEach((count, name) => {
      doc.text(`• ${name}: ${count}`, 20, yPos);
      yPos += 6;
    });
    
    yPos += 4;
  }

  // Add institutions summary if activities have agreements with institutions
  const institutionsMap = new Map<string, number>();

  activities.forEach(activity => {
    if (activity.agreement?.institution) {
      const institutionName = activity.agreement.institution.name;
      institutionsMap.set(institutionName, (institutionsMap.get(institutionName) || 0) + 1);
    }
  });

  if (institutionsMap.size > 0) {
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Actividades por Institución', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);

    institutionsMap.forEach((count, name) => {
      doc.text(`• ${name}: ${count}`, 20, yPos);
      yPos += 6;
    });

    yPos += 4;
  }
  
  // Add institution type summary
  const institutionTypeMap = new Map<string, number>();
  
  activities.forEach(activity => {
    if (activity.agreement?.institution?.type) {
      const type = activity.agreement.institution.type;
      institutionTypeMap.set(type, (institutionTypeMap.get(type) || 0) + 1);
    }
  });
  
  if (institutionTypeMap.size > 0) {
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Actividades por Tipo de Institución', 14, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);
    
    institutionTypeMap.forEach((count, type) => {
      doc.text(`• ${type}: ${count}`, 20, yPos);
      yPos += 6;
    });
    
    yPos += 4;
  }

  // Add activity type summary
  const typeMap = new Map<string, number>();

  activities.forEach(activity => {
    typeMap.set(activity.activity_type, (typeMap.get(activity.activity_type) || 0) + 1);
  });

  if (typeMap.size > 0) {
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Actividades por Tipo', 14, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);

    typeMap.forEach((count, type) => {
      doc.text(`• ${type}: ${count}`, 20, yPos);
      yPos += 6;
    });

    yPos += 4;
  }

  // Activity List Table - Basic overview
  const tableHeaders = [['Título', 'Tipo', 'Fecha', 'Municipio', 'Institución', 'Tipo Inst.', 'Estado', 'Asistentes']];

  const tableData = activities.map(activity => [
    activity.title,
    activity.activity_type,
    format(new Date(activity.scheduled_date), 'dd/MM/yyyy HH:mm'),
    activity.municipality || 'N/A',
    activity.agreement?.institution?.name || 'N/A',
    activity.agreement?.institution?.type || 'N/A',
    getStatusText(activity.status),
    activity.attendee_count?.toString() || '0'
  ]);

  doc.autoTable({
    startY: yPos,
    head: tableHeaders,
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [240, 245, 255]
    },
    styles: {
      fontSize: 9,
      cellPadding: 4
    }
  });

  // Detailed Activities
  let currentY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : 200;

  // Title for detailed section
  if (currentY > 250) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Detalle de Actividades', 14, currentY);
  currentY += 10;

  activities.forEach((activity, index) => {
    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${activity.title}`, 14, currentY);

    currentY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const details = [
      `Tipo: ${activity.activity_type}`,
      `Fecha: ${format(new Date(activity.scheduled_date), 'dd/MM/yyyy HH:mm')}`,
      `Estado: ${getStatusText(activity.status)}`,
      `Municipio: ${activity.municipality || 'N/A'}`,
      `Institución: ${activity.agreement?.institution?.name || 'N/A'}`,
      `Tipo de Institución: ${activity.agreement?.institution?.type || 'N/A'}`,
      `Asistentes: ${activity.attendee_count || 0}`,
      `Progreso: ${activity.progress_percentage || 0}%`,
      `Descripción: ${activity.description || 'Sin descripción'}`
    ];

    details.forEach(detail => {
      doc.text(detail, 20, currentY);
      currentY += 6;
    });

    currentY += 6; // Extra space between activities
  });

  // Save the PDF
  doc.save('reporte-actividades.pdf');
};

const getStatusText = (status: string): string => {
  switch(status) {
    case 'finalizado':
      return 'Finalizado';
    case 'en_proceso':
      return 'En Proceso';
    case 'cancelado':
      return 'Cancelado';
    default:
      return status;
  }
};