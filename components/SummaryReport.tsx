import React, { useRef, useState, useEffect } from 'react';
import { HPPAPData, LikertScaleOptions, RatingScaleValue, RegularSectionId, SpecificLifeDomainImpact, PainPin } from '../types';
import { IMPACT_DOMAINS_LABELS, BODY_PARTS_DEFINITIONS, PAIN_WORST_TIME_OPTIONS_MAP, LIKERT_OPTIONS_MAP } from '../constants';
import Button from './ui/Button';

// Declare global types for jspdf and html2canvas if not using ES6 imports
declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}

interface SummaryReportProps {
  data: HPPAPData;
  onEdit: (sectionId: RegularSectionId) => void;
}

const DataItem: React.FC<{ label: string; value: React.ReactNode; className?: string }> = ({ label, value, className }) => (
  <div className={`py-2 sm:grid sm:grid-cols-3 sm:gap-4 ${className}`}>
    <dt className="text-sm font-medium text-gray-600">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{value !== undefined && value !== null && value !== '' ? value : 'Not specified'}</dd>
  </div>
);

const RatingDisplay: React.FC<{ value: RatingScaleValue }> = ({ value }) => (
  <span>{value !== null ? `${value} / 10` : 'Not specified'}</span>
);

const LikertDisplay: React.FC<{ value: LikertScaleOptions | null }> = ({ value }) => (
  <span>{value || 'Not specified'}</span>
);

const generateTextSummary = (data: HPPAPData, dateTimeString: string): string => {
  let summary = `Report Generated: ${dateTimeString}\n`;
  summary += "Holistic Pain Profile & Action Planner (HPPAP) Summary\n\n";

  summary += "== Section 1: Pain Snapshot ==\n";
  summary += `Current Pain Intensity: ${data.painSnapshot.currentPainIntensity !== null ? data.painSnapshot.currentPainIntensity + ' / 10' : 'Not specified'}\n`;
  summary += `Primary Pain Location(s): ${data.painSnapshot.primaryPainLocation.map(id => BODY_PARTS_DEFINITIONS.find(p => p.id === id)?.name || id).join(', ') || 'None selected'}\n`;
  const pins: PainPin[] = data.painSnapshot.pinLocations ?? [];
  if (pins.length > 0) {
    const pinLines = pins.map((p, i) => `#${i + 1}: ${p.label || 'Unlabeled'}`).join('; ');
    summary += `Pin Locations: ${pinLines}\n`;
  } else {
    summary += `Pin Locations: None\n`;
  }
  summary += `Pain Descriptors: ${data.painSnapshot.painDescriptors.join(', ') || 'None selected'}\n`;
  if (data.painSnapshot.otherPainDescriptor) {
    summary += `Other Descriptor: ${data.painSnapshot.otherPainDescriptor}\n`;
  }
  summary += "\n";

  summary += "== Section 2: Pain Patterns & Triggers ==\n";
  summary += `Average Pain (Last 7 Days): ${data.painPatternsTriggers.avgPainLast7Days !== null ? data.painPatternsTriggers.avgPainLast7Days + ' / 10' : 'Not specified'}\n`;
  summary += `Worst Pain (Last 7 Days): ${data.painPatternsTriggers.worstPainLast7Days !== null ? data.painPatternsTriggers.worstPainLast7Days + ' / 10' : 'Not specified'}\n`;
  summary += `Least Pain (Last 7 Days): ${data.painPatternsTriggers.leastPainLast7Days !== null ? data.painPatternsTriggers.leastPainLast7Days + ' / 10' : 'Not specified'}\n`;
  const painWorstTimeLabel = PAIN_WORST_TIME_OPTIONS_MAP.find(opt => opt.value === data.painPatternsTriggers.painWorstTime)?.label;
  summary += `Pain Worst Time: ${painWorstTimeLabel || data.painPatternsTriggers.painWorstTime || 'Not specified'}\n`;
  summary += `Activities Worsening Pain: ${data.painPatternsTriggers.activitiesWorstPain === null ? 'Not specified' : (data.painPatternsTriggers.activitiesWorstPain ? `Yes: ${data.painPatternsTriggers.activitiesWorstPainDesc || 'Details not provided'}` : 'No')}\n`;
  summary += `Activities Improving Pain: ${data.painPatternsTriggers.activitiesBetterPain === null ? 'Not specified' : (data.painPatternsTriggers.activitiesBetterPain ? `Yes: ${data.painPatternsTriggers.activitiesBetterPainDesc || 'Details not provided'}` : 'No')}\n`;
  summary += "\n";
  
  summary += "== Section 3: Impact on Daily Life ==\n";
  summary += `General Interference: ${data.impactDailyLife.generalInterference !== null ? data.impactDailyLife.generalInterference + ' / 10' : 'Not specified'}\n`;
  IMPACT_DOMAINS_LABELS.forEach(domain => {
    const value = data.impactDailyLife.specificLifeDomains[domain.key as keyof SpecificLifeDomainImpact];
    summary += `${domain.label}: ${value !== null ? value + ' / 10' : 'Not specified'}\n`;
  });
  summary += "\n";

  summary += "== Section 4: Emotional Well-being & Pain ==\n";
  const emotionalResponsesMap = {
    frustrated: "Felt Frustrated",
    anxious: "Felt Anxious/Worried",
    hopeless: "Felt Hopeless/Helpless",
    angry: "Felt Angry",
  };
  for (const [key, label] of Object.entries(emotionalResponsesMap)) {
    const value = data.emotionalWellbeing.emotionalResponse[key as keyof typeof data.emotionalWellbeing.emotionalResponse];
    summary += `${label}: ${LIKERT_OPTIONS_MAP.find(opt => opt.value === value)?.label || value || 'Not specified'}\n`;
  }
  summary += `Positive Outlook: ${LIKERT_OPTIONS_MAP.find(opt => opt.value === data.emotionalWellbeing.positiveOutlook)?.label || data.emotionalWellbeing.positiveOutlook || 'Not specified'}\n`;
  summary += "\n";

  summary += "== Section 5: Coping & Management Strategies ==\n";
  summary += `Current Strategies: ${data.copingManagement.currentStrategies.join(', ') || 'None selected'}\n`;
  if (data.copingManagement.otherStrategy) {
    summary += `Other Strategy: ${data.copingManagement.otherStrategy}\n`;
  }
  summary += `Strategies Rated for Helpfulness: ${data.copingManagement.mainStrategiesToRate.join(', ') || 'None rated'}\n`;
  data.copingManagement.mainStrategiesHelpfulness.forEach(sh => {
    summary += `Helpfulness of "${sh.strategy}": ${sh.helpfulness !== null ? sh.helpfulness + ' / 10' : 'Not specified'}\n`;
  });
  summary += `Confidence in Managing Pain: ${data.copingManagement.confidenceInManagement !== null ? data.copingManagement.confidenceInManagement + ' / 10' : 'Not specified'}\n`;
  summary += "\n";

  summary += "== Section 6: Personal Pain Goals & Action Planning ==\n";
  const impactfulLimitationLabel = IMPACT_DOMAINS_LABELS.find(d => d.key === data.personalGoalsActionPlanner.mostImpactfulLimitation)?.label || (data.personalGoalsActionPlanner.mostImpactfulLimitation === "generalInterference" ? "General Interference with Daily Life" : data.personalGoalsActionPlanner.mostImpactfulLimitation);
  summary += `Most Impactful Limitation to Improve: ${impactfulLimitationLabel || 'Not specified'}\n`;
  summary += `Small Achievable Goal: ${data.personalGoalsActionPlanner.smallAchievableGoal || 'Not specified'}\n`;
  summary += `Support Needed: ${data.personalGoalsActionPlanner.supportNeeded.join(', ') || 'None selected'}\n`;
  if (data.personalGoalsActionPlanner.otherSupportNeeded) {
    summary += `Other Support: ${data.personalGoalsActionPlanner.otherSupportNeeded}\n`;
  }
  summary += "\n";

  return summary;
};


const SummaryReport: React.FC<SummaryReportProps> = ({ data, onEdit }) => {
  const summaryReportRef = useRef<HTMLDivElement>(null);
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [formattedDateTime, setFormattedDateTime] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    };
    setFormattedDateTime(now.toLocaleString(undefined, options));
  }, []);

  const {
    painSnapshot,
    painPatternsTriggers,
    impactDailyLife,
    emotionalWellbeing,
    copingManagement,
    personalGoalsActionPlanner,
  } = data;

  const handleDownloadPDF = async () => {
    const { jsPDF } = window.jspdf;
    const html2canvas = window.html2canvas;

    if (!jsPDF || !html2canvas) {
      console.error("PDF generation resources not available.");
      alert("Sorry, PDF generation is currently unavailable. Please try again later.");
      return;
    }

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;

      // Helper to check if we need a new page
      const checkPageBreak = (requiredSpace: number) => {
        if (yPos + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      // Helper to add text with word wrap
      const addText = (text: string, fontSize: number, isBold: boolean = false, indent: number = 0) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
        const lines = pdf.splitTextToSize(text, contentWidth - indent);
        const lineHeight = fontSize * 0.5;
        
        lines.forEach((line: string) => {
          checkPageBreak(lineHeight);
          pdf.text(line, margin + indent, yPos);
          yPos += lineHeight;
        });
      };

      // Title
      addText('Holistic Pain Profile & Action Planner (HPPAP)', 18, true);
      yPos += 2;
      addText(`Report Generated: ${formattedDateTime}`, 10);
      yPos += 8;

      // Section 1: Pain Snapshot
      addText('Pain Snapshot', 14, true);
      yPos += 3;
      addText(`Current Pain Intensity: ${painSnapshot.currentPainIntensity !== null ? painSnapshot.currentPainIntensity + ' / 10' : 'Not specified'}`, 11);
      yPos += 1;
      addText(`Primary Pain Location(s): ${painSnapshot.primaryPainLocation.map(id => BODY_PARTS_DEFINITIONS.find(p => p.id === id)?.name || id).join(', ') || 'None selected'}`, 11);
      yPos += 1;
      
      // Pin locations
      const pins: PainPin[] = painSnapshot.pinLocations ?? [];
      if (pins.length > 0) {
        addText(`Pin Locations: ${pins.map((p, i) => `#${i + 1}: ${p.label || 'Unlabeled'}`).join('; ')}`, 11);
        yPos += 3;
        
        // Add anatomical image with pins
        const imageContainer = document.querySelector('.anatomical-image-container') as HTMLElement;
        if (imageContainer) {
          checkPageBreak(80); // Reserve space for image
          
          const canvas = await html2canvas(imageContainer, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = 80; // Width in mm
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Center the image
          const xPos = (pageWidth - imgWidth) / 2;
          pdf.addImage(imgData, 'PNG', xPos, yPos, imgWidth, imgHeight);
          yPos += imgHeight + 5;
        }
      }
      
      addText(`Pain Descriptors: ${painSnapshot.painDescriptors.join(', ') || 'None selected'}`, 11);
      if (painSnapshot.otherPainDescriptor) {
        yPos += 1;
        addText(`Other Descriptor: ${painSnapshot.otherPainDescriptor}`, 11);
      }
      yPos += 6;

      // Section 2: Pain Patterns & Triggers
      checkPageBreak(20);
      addText('Pain Patterns & Triggers', 14, true);
      yPos += 3;
      addText(`Average Pain (Last 7 Days): ${painPatternsTriggers.avgPainLast7Days !== null ? painPatternsTriggers.avgPainLast7Days + ' / 10' : 'Not specified'}`, 11);
      yPos += 1;
      addText(`Worst Pain (Last 7 Days): ${painPatternsTriggers.worstPainLast7Days !== null ? painPatternsTriggers.worstPainLast7Days + ' / 10' : 'Not specified'}`, 11);
      yPos += 1;
      addText(`Least Pain (Last 7 Days): ${painPatternsTriggers.leastPainLast7Days !== null ? painPatternsTriggers.leastPainLast7Days + ' / 10' : 'Not specified'}`, 11);
      yPos += 1;
      addText(`Pain Worst Time: ${PAIN_WORST_TIME_OPTIONS_MAP.find(opt => opt.value === painPatternsTriggers.painWorstTime)?.label || 'Not specified'}`, 11);
      yPos += 1;
      addText(`Activities Worsening Pain: ${painPatternsTriggers.activitiesWorstPain === null ? 'Not specified' : (painPatternsTriggers.activitiesWorstPain ? `Yes: ${painPatternsTriggers.activitiesWorstPainDesc || 'Details not provided'}` : 'No')}`, 11);
      yPos += 1;
      addText(`Activities Improving Pain: ${painPatternsTriggers.activitiesBetterPain === null ? 'Not specified' : (painPatternsTriggers.activitiesBetterPain ? `Yes: ${painPatternsTriggers.activitiesBetterPainDesc || 'Details not provided'}` : 'No')}`, 11);
      yPos += 6;

      // Section 3: Impact on Daily Life
      checkPageBreak(30);
      addText('Impact on Daily Life', 14, true);
      yPos += 3;
      addText(`General Interference: ${impactDailyLife.generalInterference !== null ? impactDailyLife.generalInterference + ' / 10' : 'Not specified'}`, 11);
      yPos += 1;
      IMPACT_DOMAINS_LABELS.forEach(domain => {
        const value = impactDailyLife.specificLifeDomains[domain.key];
        addText(`${domain.label}: ${value !== null ? value + ' / 10' : 'Not specified'}`, 11);
        yPos += 1;
      });
      yPos += 5;

      // Section 4: Emotional Well-being
      checkPageBreak(20);
      addText('Emotional Well-being & Pain', 14, true);
      yPos += 3;
      addText(`Felt Frustrated: ${LIKERT_OPTIONS_MAP.find(opt => opt.value === emotionalWellbeing.emotionalResponse.frustrated)?.label || 'Not specified'}`, 11);
      yPos += 1;
      addText(`Felt Anxious/Worried: ${LIKERT_OPTIONS_MAP.find(opt => opt.value === emotionalWellbeing.emotionalResponse.anxious)?.label || 'Not specified'}`, 11);
      yPos += 1;
      addText(`Felt Hopeless/Helpless: ${LIKERT_OPTIONS_MAP.find(opt => opt.value === emotionalWellbeing.emotionalResponse.hopeless)?.label || 'Not specified'}`, 11);
      yPos += 1;
      addText(`Felt Angry: ${LIKERT_OPTIONS_MAP.find(opt => opt.value === emotionalWellbeing.emotionalResponse.angry)?.label || 'Not specified'}`, 11);
      yPos += 1;
      addText(`Positive Outlook: ${LIKERT_OPTIONS_MAP.find(opt => opt.value === emotionalWellbeing.positiveOutlook)?.label || 'Not specified'}`, 11);
      yPos += 6;

      // Section 5: Coping & Management
      checkPageBreak(25);
      addText('Coping & Management Strategies', 14, true);
      yPos += 3;
      addText(`Current Strategies: ${copingManagement.currentStrategies.join(', ') || 'None selected'}`, 11);
      if (copingManagement.otherStrategy) {
        yPos += 1;
        addText(`Other Strategy: ${copingManagement.otherStrategy}`, 11);
      }
      yPos += 1;
      copingManagement.mainStrategiesHelpfulness.forEach(sh => {
        addText(`Helpfulness of "${sh.strategy}": ${sh.helpfulness !== null ? sh.helpfulness + ' / 10' : 'Not specified'}`, 11);
        yPos += 1;
      });
      addText(`Confidence in Managing Pain: ${copingManagement.confidenceInManagement !== null ? copingManagement.confidenceInManagement + ' / 10' : 'Not specified'}`, 11);
      yPos += 6;

      // Section 6: Personal Goals & Action Plan
      checkPageBreak(20);
      addText('Personal Goals & Action Planning', 14, true);
      yPos += 3;
      const impactfulLimitationLabel = IMPACT_DOMAINS_LABELS.find(d => d.key === personalGoalsActionPlanner.mostImpactfulLimitation)?.label || (personalGoalsActionPlanner.mostImpactfulLimitation === "generalInterference" ? "General Interference with Daily Life" : personalGoalsActionPlanner.mostImpactfulLimitation);
      addText(`Most Impactful Limitation to Improve: ${impactfulLimitationLabel || 'Not specified'}`, 11);
      yPos += 1;
      addText(`Small Achievable Goal: ${personalGoalsActionPlanner.smallAchievableGoal || 'Not specified'}`, 11);
      yPos += 1;
      addText(`Support Needed: ${personalGoalsActionPlanner.supportNeeded.join(', ') || 'None selected'}`, 11);
      if (personalGoalsActionPlanner.otherSupportNeeded) {
        yPos += 1;
        addText(`Other Support: ${personalGoalsActionPlanner.otherSupportNeeded}`, 11);
      }

      pdf.save('HPPAP_Summary.pdf');

    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("An error occurred while generating the PDF. Please try again.");
    }
  };

  const handleCopySummaryForEmail = () => {
    const textSummary = generateTextSummary(data, formattedDateTime);
    const subject = "My Holistic Pain Profile & Action Planner (HPPAP) Summary";
    const fullEmailContent = "Subject: " + subject + "\n\n" +
      "Hello,\n\nPlease find my HPPAP summary details below. This information can help facilitate discussions about my pain management.\n\n" +
      "You can also download this summary as a PDF from the application and attach it to an email if preferred.\n\n" +
      "------------------------------------------------------\n" +
      textSummary +
      "------------------------------------------------------\n\n" +
      "Thank you.";

    try {
      navigator.clipboard.writeText(fullEmailContent);
      setShowCopyNotification(true);
      setTimeout(() => {
        setShowCopyNotification(false);
      }, 3000);
      // Keep original alert for users who might miss the notification or for accessibility.
      alert("The summary content (including a suggested subject and body) has been copied to your clipboard. Please paste it into a new email message.");
    } catch (err) {
      console.warn("Failed to copy email content to clipboard:", err);
      alert("Could not copy to clipboard automatically. Please manually copy the text from the summary or use the Download PDF option.");
    }
  };


  return (
    <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg">
      <div id="summary-report-printable-area" ref={summaryReportRef}>
        <h2 className="text-3xl font-semibold text-gray-800 mb-2">HPPAP Summary Report</h2>
        {formattedDateTime && (
          <p className="text-sm text-gray-600 mb-6 pb-3 border-b report-datetime">
            Report Generated: {formattedDateTime}
          </p>
        )}
        
        {/* Section 1 */}
        <div className="mb-6 pdf-keep">
          <h3 className="text-xl font-semibold text-blue-700 mb-3 flex justify-between items-center">
            Pain Snapshot
            <button onClick={() => onEdit('painSnapshot')} aria-label="Edit Pain Snapshot" className="text-sm text-blue-500 hover:underline no-print no-pdf-export">Edit</button>
          </h3>
          <dl>
            <DataItem label="Current Pain Intensity" value={<RatingDisplay value={painSnapshot.currentPainIntensity} />} />
            <DataItem label="Primary Pain Location(s)" value={painSnapshot.primaryPainLocation.map(id => BODY_PARTS_DEFINITIONS.find(p => p.id === id)?.name || id).join(', ') || 'None selected'} />
            <DataItem label="Pain Descriptors" value={painSnapshot.painDescriptors.join(', ') || 'None selected'} />
            {painSnapshot.otherPainDescriptor && <DataItem label="Other Descriptor" value={painSnapshot.otherPainDescriptor} />}
          </dl>
          {/* Pins summary (labels + read-only overlay) */}
          <div className="mt-6 space-y-3" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <h4 className="text-md font-semibold text-gray-800">Pin Locations</h4>
            {(!painSnapshot.pinLocations || painSnapshot.pinLocations.length === 0) ? (
              <p className="text-sm text-gray-600">No pins added.</p>
            ) : (
              <>
                <ul className="list-disc list-inside text-sm text-gray-800 mb-4">
                  {painSnapshot.pinLocations.map((p, idx) => (
                    <li key={p.id}>#{idx + 1}: {p.label || 'Unlabeled'}</li>
                  ))}
                </ul>
                <div className="relative w-full max-w-sm border border-gray-200 rounded overflow-hidden mt-8 mb-8 anatomical-image-container" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <img src="images/anatomical_views.png" alt="Anatomical view" className="block w-full h-auto" />
                  {(painSnapshot.pinLocations || []).map(p => (
                    <span
                      key={p.id}
                      className="absolute w-2 h-2 bg-red-600 rounded-full shadow"
                      style={{ left: `${p.xPct}%`, top: `${p.yPct}%`, transform: 'translate(-50%, -100%)' }}
                      aria-label={p.label || 'Unlabeled pin'}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section 2 */}
        <div className="mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <h3 className="text-xl font-semibold text-blue-700 mb-3 flex justify-between items-center">
            Pain Patterns & Triggers
            <button onClick={() => onEdit('painPatternsTriggers')} aria-label="Edit Pain Patterns & Triggers" className="text-sm text-blue-500 hover:underline no-print no-pdf-export">Edit</button>
          </h3>
          <dl>
            <DataItem label="Average Pain (Last 7 Days)" value={<RatingDisplay value={painPatternsTriggers.avgPainLast7Days} />} />
            <DataItem label="Worst Pain (Last 7 Days)" value={<RatingDisplay value={painPatternsTriggers.worstPainLast7Days} />} />
            <DataItem label="Least Pain (Last 7 Days)" value={<RatingDisplay value={painPatternsTriggers.leastPainLast7Days} />} />
            <DataItem label="Pain Worst Time" value={PAIN_WORST_TIME_OPTIONS_MAP.find(opt => opt.value === painPatternsTriggers.painWorstTime)?.label || painPatternsTriggers.painWorstTime || 'Not specified'} />
            <DataItem label="Activities Worsening Pain" value={painPatternsTriggers.activitiesWorstPain === null ? 'Not specified' : (painPatternsTriggers.activitiesWorstPain ? `Yes: ${painPatternsTriggers.activitiesWorstPainDesc || 'Details not provided'}` : 'No')} />
            <DataItem label="Activities Improving Pain" value={painPatternsTriggers.activitiesBetterPain === null ? 'Not specified' : (painPatternsTriggers.activitiesBetterPain ? `Yes: ${painPatternsTriggers.activitiesBetterPainDesc || 'Details not provided'}` : 'No')} />
          </dl>
        </div>

        {/* Section 3 */}
        <div className="mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <h3 className="text-xl font-semibold text-blue-700 mb-3 flex justify-between items-center">
            Impact on Daily Life
            <button onClick={() => onEdit('impactDailyLife')} aria-label="Edit Impact on Daily Life" className="text-sm text-blue-500 hover:underline no-print no-pdf-export">Edit</button>
          </h3>
          <dl>
            <DataItem label="General Interference" value={<RatingDisplay value={impactDailyLife.generalInterference} />} />
            {IMPACT_DOMAINS_LABELS.map(domain => (
              <DataItem 
                key={domain.key} 
                label={domain.label} 
                value={<RatingDisplay value={impactDailyLife.specificLifeDomains[domain.key as keyof typeof impactDailyLife.specificLifeDomains]} />} 
              />
            ))}
          </dl>
        </div>

        {/* Section 4 */}
        <div className="mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <h3 className="text-xl font-semibold text-blue-700 mb-3 flex justify-between items-center">
            Emotional Well-being
            <button onClick={() => onEdit('emotionalWellbeing')} aria-label="Edit Emotional Well-being" className="text-sm text-blue-500 hover:underline no-print no-pdf-export">Edit</button>
          </h3>
          <dl>
            <DataItem label="Felt Frustrated" value={<LikertDisplay value={emotionalWellbeing.emotionalResponse.frustrated} />} />
            <DataItem label="Felt Anxious/Worried" value={<LikertDisplay value={emotionalWellbeing.emotionalResponse.anxious} />} />
            <DataItem label="Felt Hopeless/Helpless" value={<LikertDisplay value={emotionalWellbeing.emotionalResponse.hopeless} />} />
            <DataItem label="Felt Angry" value={<LikertDisplay value={emotionalWellbeing.emotionalResponse.angry} />} />
            <DataItem label="Positive Outlook" value={<LikertDisplay value={emotionalWellbeing.positiveOutlook} />} />
          </dl>
        </div>

        {/* Section 5 */}
         <div className="mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <h3 className="text-xl font-semibold text-blue-700 mb-3 flex justify-between items-center">
            Coping & Management
            <button onClick={() => onEdit('copingManagement')} aria-label="Edit Coping & Management" className="text-sm text-blue-500 hover:underline no-print no-pdf-export">Edit</button>
          </h3>
          <dl>
            <DataItem label="Current Strategies" value={copingManagement.currentStrategies.join(', ') || 'None selected'} />
            {copingManagement.otherStrategy && <DataItem label="Other Strategy" value={copingManagement.otherStrategy} />}
            <DataItem label="Strategies Rated for Helpfulness" value={copingManagement.mainStrategiesToRate.join(', ') || 'None rated'} />
            {copingManagement.mainStrategiesHelpfulness.map(sh => (
               <DataItem key={sh.strategy} label={`Helpfulness of "${sh.strategy}"`} value={<RatingDisplay value={sh.helpfulness} />} />
            ))}
            <DataItem label="Confidence in Managing Pain" value={<RatingDisplay value={copingManagement.confidenceInManagement} />} />
          </dl>
        </div>

        {/* Section 6 */}
        <div className="mb-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <h3 className="text-xl font-semibold text-blue-700 mb-3 flex justify-between items-center">
            Personal Goals & Action Plan
            <button onClick={() => onEdit('personalGoalsActionPlanner')} aria-label="Edit Personal Goals & Action Plan" className="text-sm text-blue-500 hover:underline no-print no-pdf-export">Edit</button>
          </h3>
          <dl>
            <DataItem label="Most Impactful Limitation to Improve" value={personalGoalsActionPlanner.mostImpactfulLimitation ? (IMPACT_DOMAINS_LABELS.find(d => d.key === personalGoalsActionPlanner.mostImpactfulLimitation)?.label || (personalGoalsActionPlanner.mostImpactfulLimitation === "generalInterference" ? "General Interference with Daily Life" : personalGoalsActionPlanner.mostImpactfulLimitation)) : 'Not specified'} />
            <DataItem label="Small Achievable Goal" value={personalGoalsActionPlanner.smallAchievableGoal} />
            <DataItem label="Support Needed" value={personalGoalsActionPlanner.supportNeeded.join(', ') || 'None selected'} />
            {personalGoalsActionPlanner.otherSupportNeeded && <DataItem label="Other Support" value={personalGoalsActionPlanner.otherSupportNeeded} />}
          </dl>
        </div>
      </div> {/* End of summary-report-printable-area */}

      {showCopyNotification && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 text-sm rounded-md text-center no-print transition-opacity duration-300" role="alert">
          Summary copied to clipboard!
        </div>
      )}

       <div className="mt-8 pt-6 border-t border-gray-200 text-center space-y-3 md:space-y-0 md:flex md:justify-center md:space-x-3 no-print">
         <Button onClick={handleDownloadPDF} variant="secondary">
           Download PDF
         </Button>
         <Button onClick={handleCopySummaryForEmail} variant="secondary">
           Copy Summary for Email
         </Button>
       </div>
       <div className="mt-4 text-center no-print">
         <p className="text-sm text-gray-500">This report can be shared with your healthcare provider.</p>
       </div>
    </div>
  );
};

export default SummaryReport;