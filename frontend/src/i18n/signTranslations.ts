// Traffic sign name + meaning translations in EN / Tamil / Sinhala
export interface SignLang {
  name: string;
  meaning: string;
}

export type SignTranslationEntry = {
  en: SignLang;
  ta: SignLang;
  si: SignLang;
};

// Keyed by lowercase English sign name (matches backend label)
const signTranslations: Record<string, SignTranslationEntry> = {
  "stop": {
    en: { name: "Stop", meaning: "Come to a complete stop before proceeding." },
    ta: { name: "நிறுத்தம்", meaning: "தொடர்வதற்கு முன் முழுமையாக நிறுத்தவும்." },
    si: { name: "නවත්වන්න", meaning: "ඉදිරියට යාමට පෙර සම්පූර්ණයෙන් නවත්වන්න." },
  },
  "no entry": {
    en: { name: "No Entry", meaning: "Entry is prohibited in this direction." },
    ta: { name: "நுழைவு தடை", meaning: "இந்த திசையில் நுழைவு தடைசெய்யப்பட்டுள்ளது." },
    si: { name: "ඇතුළු වීම තහනම්", meaning: "මෙම දිශාවෙන් ඇතුළු වීම තහනම්." },
  },
  "speed limit": {
    en: { name: "Speed Limit", meaning: "Do not exceed the indicated speed." },
    ta: { name: "வேக வரம்பு", meaning: "குறிப்பிட்ட வேகத்தை தாண்டாதீர்கள்." },
    si: { name: "වේග සීමාව", meaning: "දක්වා ඇති වේගය ඉක්මවන්න එපා." },
  },
  "give way": {
    en: { name: "Give Way", meaning: "Yield to oncoming traffic." },
    ta: { name: "வழிவிடு", meaning: "வரும் வாகனங்களுக்கு வழிவிடவும்." },
    si: { name: "මාර්ගය දෙන්න", meaning: "එන රථවාහනවලට ඉඩ දෙන්න." },
  },
  "no u-turn": {
    en: { name: "No U-Turn", meaning: "U-turns are not permitted here." },
    ta: { name: "U திரும்பல் தடை", meaning: "இங்கு U திரும்பல் அனுமதிக்கப்படவில்லை." },
    si: { name: "U හැරවීම තහනම්", meaning: "මෙහිදී U හැරවීම් අවසර නැත." },
  },
  "no left turn": {
    en: { name: "No Left Turn", meaning: "Left turns are prohibited." },
    ta: { name: "இடது திரும்பல் தடை", meaning: "இடது திரும்பல் தடைசெய்யப்பட்டுள்ளது." },
    si: { name: "වම් හැරවීම තහනම්", meaning: "වම් හැරවීම් තහනම්." },
  },
  "no right turn": {
    en: { name: "No Right Turn", meaning: "Right turns are prohibited." },
    ta: { name: "வலது திரும்பல் தடை", meaning: "வலது திரும்பல் தடைசெய்யப்பட்டுள்ளது." },
    si: { name: "දකුණු හැරවීම තහනම්", meaning: "දකුණු හැරවීම් තහනම්." },
  },
  "no overtaking": {
    en: { name: "No Overtaking", meaning: "Overtaking other vehicles is not allowed." },
    ta: { name: "முந்துவரிசை தடை", meaning: "மற்ற வாகனங்களை முந்துவது அனுமதிக்கப்படவில்லை." },
    si: { name: "ඉදිරි යාම තහනම්", meaning: "වෙනත් රථවාහන ඉදිරිකර ගෙන යාම අවසර නැත." },
  },
  "pedestrian crossing": {
    en: { name: "Pedestrian Crossing", meaning: "Slow down and yield to pedestrians." },
    ta: { name: "பாதசாரி கடவு", meaning: "வேகம் குறையுங்கள், பாதசாரிகளுக்கு வழி விடுங்கள்." },
    si: { name: "පාගමන් තීරුව", meaning: "වේගය අඩු කර පදිකයන්ට ඉඩ දෙන්න." },
  },
  "school zone": {
    en: { name: "School Zone", meaning: "Slow down — children may be crossing." },
    ta: { name: "பள்ளி மண்டலம்", meaning: "வேகம் குறையுங்கள் — குழந்தைகள் கடக்கலாம்." },
    si: { name: "පාසල් කලාපය", meaning: "වේගය අඩු කරන්න — ළමයින් තිබිය හැකිය." },
  },
  "slippery road": {
    en: { name: "Slippery Road", meaning: "Road surface is slippery — drive carefully." },
    ta: { name: "வழுக்கும் சாலை", meaning: "சாலை மேற்பரப்பு வழுக்கும் — கவனமாக ஓட்டுங்கள்." },
    si: { name: "ලිස්සෙන මාර්ගය", meaning: "මාර්ගය ලිස්සෙනසුලු — ප්‍රවේශමෙන් ධාවනය කරන්න." },
  },
  "roundabout": {
    en: { name: "Roundabout", meaning: "Give way to traffic already in the roundabout." },
    ta: { name: "வட்டசாலை", meaning: "வட்டசாலையில் உள்ள வாகனங்களுக்கு வழிவிடவும்." },
    si: { name: "රවුම් පාර", meaning: "රවුම් පාරේ ඇති රථවාහනවලට ඉඩ දෙන්න." },
  },
  "one way": {
    en: { name: "One Way", meaning: "Traffic flows in one direction only." },
    ta: { name: "ஒரு திசை", meaning: "போக்குவரத்து ஒரே திசையில் மட்டுமே சென்றுகொண்டிருக்கும்." },
    si: { name: "එක් මාර්ගය", meaning: "රථවාහන ගමන් ගන්නේ එක් දිශාවකට පමණි." },
  },
  "traffic light": {
    en: { name: "Traffic Light", meaning: "Obey the traffic signal ahead." },
    ta: { name: "போக்குவரத்து விளக்கு", meaning: "முன்னால் உள்ள போக்குவரத்து சிக்னலை பின்பற்றவும்." },
    si: { name: "රථවාහන සංඥාව", meaning: "ඉදිරියෙහි ඇති රථවාහන සංඥාවට අනුගත වෙන්න." },
  },
  "parking": {
    en: { name: "Parking", meaning: "Parking is permitted in this area." },
    ta: { name: "நிறுத்துமிடம்", meaning: "இந்த பகுதியில் நிறுத்துதல் அனுமதிக்கப்படுகிறது." },
    si: { name: "රථ නැවැත්වීම", meaning: "මෙම ප්‍රදේශයේ රථ නැවැත්වීම අවසර ඇත." },
  },
  "no parking": {
    en: { name: "No Parking", meaning: "Parking is not allowed here." },
    ta: { name: "நிறுத்துதல் தடை", meaning: "இங்கு நிறுத்துதல் அனுமதிக்கப்படவில்லை." },
    si: { name: "රථ නැවැත්වීම තහනම්", meaning: "මෙහි රථ නැවැත්වීම අවසර නැත." },
  },
  "hospital": {
    en: { name: "Hospital", meaning: "Hospital ahead — drive quietly." },
    ta: { name: "மருத்துவமனை", meaning: "முன்னால் மருத்துவமனை — அமைதியாக ஓட்டுங்கள்." },
    si: { name: "රෝහල", meaning: "ඉදිරියෙහි රෝහලක් — නිශ්ශබ්දව ධාවනය කරන්න." },
  },
  "keep left": {
    en: { name: "Keep Left", meaning: "Stay on the left side of the road." },
    ta: { name: "இடது பக்கம் இருங்கள்", meaning: "சாலையின் இடது பக்கத்தில் இருங்கள்." },
    si: { name: "වමට රැඳෙන්න", meaning: "මාර්ගයේ වම් පැත්තේ රැඳෙන්න." },
  },
  "keep right": {
    en: { name: "Keep Right", meaning: "Stay on the right side of the road." },
    ta: { name: "வலது பக்கம் இருங்கள்", meaning: "சாலையின் வலது பக்கத்தில் இருங்கள்." },
    si: { name: "දකුණට රැඳෙන්න", meaning: "මාර්ගයේ දකුණු පැත்තේ රැඳෙන්න." },
  },
  "danger": {
    en: { name: "Danger", meaning: "Proceed with extreme caution." },
    ta: { name: "அபாயம்", meaning: "மிகவும் கவனமாக செல்லவும்." },
    si: { name: "භීතිකාව", meaning: "ඉතා ප්‍රවේශමෙන් ඉදිරියට යන්න." },
  },
};

export function getSignTranslation(label: string): SignTranslationEntry | null {
  const key = label.toLowerCase().trim();
  return signTranslations[key] || null;
}

export function getSignInLang(label: string, lang: "en" | "ta" | "si"): SignLang {
  const entry = getSignTranslation(label);
  if (entry) return entry[lang];
  return { name: label, meaning: "" };
}

export default signTranslations;
