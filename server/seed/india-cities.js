/**
 * India's states, union territories and their major cities, so people can pick their own city at
 * sign-up instead of hitting a dead end. Roughly ordered by population within each state.
 *
 * Imported by `npm run seed:cities`, which is idempotent — add names here and run it again.
 * Nothing is ever renamed or removed by the importer, so editing this list is safe once live.
 *
 * Several names repeat across states (Bilaspur, Udaipur, Aurangabad, Hamirpur, Pratapgarh…).
 * City slugs are globally unique, so the importer disambiguates those with a state suffix rather
 * than this file having to care.
 */
export const INDIA_LOCATIONS = [
  {
    state: 'Andhra Pradesh',
    cities: [
      'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Kakinada',
      'Tirupati', 'Anantapur', 'Kadapa', 'Vizianagaram', 'Eluru', 'Ongole', 'Nandyal',
      'Machilipatnam', 'Chittoor', 'Srikakulam', 'Tenali', 'Proddatur', 'Adoni', 'Bhimavaram',
      'Madanapalle', 'Hindupur', 'Guntakal',
    ],
  },
  { state: 'Arunachal Pradesh', cities: ['Itanagar', 'Naharlagun', 'Pasighat'] },
  {
    state: 'Assam',
    cities: [
      'Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon',
      'Dhubri', 'Diphu', 'North Lakhimpur', 'Goalpara',
    ],
  },
  {
    state: 'Bihar',
    cities: [
      'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Arrah', 'Begusarai',
      'Katihar', 'Munger', 'Chhapra', 'Bettiah', 'Saharsa', 'Sasaram', 'Hajipur', 'Dehri',
      'Siwan', 'Motihari', 'Bihar Sharif', 'Nawada', 'Buxar', 'Kishanganj', 'Jamalpur',
      'Jehanabad', 'Aurangabad', 'Samastipur',
    ],
  },
  {
    state: 'Chhattisgarh',
    cities: [
      'Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Raigarh', 'Jagdalpur',
      'Ambikapur', 'Dhamtari', 'Mahasamund',
    ],
  },
  { state: 'Goa', cities: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'] },
  {
    state: 'Gujarat',
    cities: [
      'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh',
      'Gandhinagar', 'Gandhidham', 'Anand', 'Nadiad', 'Navsari', 'Morbi', 'Surendranagar',
      'Bharuch', 'Mehsana', 'Bhuj', 'Porbandar', 'Palanpur', 'Valsad', 'Vapi', 'Veraval',
      'Godhra', 'Patan', 'Botad', 'Amreli', 'Dahod',
    ],
  },
  {
    state: 'Haryana',
    cities: [
      'Faridabad', 'Gurugram', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal',
      'Sonipat', 'Panchkula', 'Bhiwani', 'Sirsa', 'Bahadurgarh', 'Jind', 'Kaithal', 'Rewari',
      'Palwal', 'Kurukshetra',
    ],
  },
  {
    state: 'Himachal Pradesh',
    cities: [
      'Shimla', 'Solan', 'Dharamshala', 'Mandi', 'Baddi', 'Kullu', 'Hamirpur', 'Bilaspur',
      'Una', 'Nahan', 'Palampur', 'Manali',
    ],
  },
  {
    state: 'Jharkhand',
    cities: [
      'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro Steel City', 'Deoghar', 'Hazaribagh', 'Giridih',
      'Ramgarh', 'Phusro', 'Medininagar', 'Chaibasa', 'Dumka',
    ],
  },
  {
    state: 'Karnataka',
    cities: [
      'Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi', 'Kalaburagi', 'Davanagere',
      'Ballari', 'Vijayapura', 'Shivamogga', 'Tumakuru', 'Raichur', 'Bidar', 'Hassan', 'Udupi',
      'Hospet', 'Gadag', 'Chitradurga', 'Kolar', 'Mandya', 'Chikkamagaluru', 'Bagalkot',
      'Karwar', 'Haveri',
    ],
  },
  {
    state: 'Kerala',
    cities: [
      'Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Kollam', 'Thrissur', 'Alappuzha', 'Palakkad',
      'Kannur', 'Kottayam', 'Malappuram', 'Manjeri', 'Thalassery', 'Kasaragod', 'Pathanamthitta',
      'Thodupuzha', 'Wayanad', 'Perinthalmanna',
    ],
  },
  {
    state: 'Madhya Pradesh',
    cities: [
      'Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam',
      'Rewa', 'Katni', 'Singrauli', 'Burhanpur', 'Khandwa', 'Morena', 'Bhind', 'Guna',
      'Shivpuri', 'Vidisha', 'Chhindwara', 'Damoh', 'Mandsaur', 'Khargone', 'Neemuch',
      'Narmadapuram', 'Itarsi', 'Sehore', 'Betul',
    ],
  },
  {
    state: 'Maharashtra',
    cities: [
      // Nashik, Mumbai, Pune, Nagpur and Aurangabad are already created by the main seed.
      'Thane', 'Pimpri-Chinchwad', 'Navi Mumbai', 'Solapur', 'Kalyan-Dombivli', 'Vasai-Virar',
      'Kolhapur', 'Amravati', 'Nanded', 'Sangli', 'Jalgaon', 'Akola', 'Latur', 'Dhule',
      'Ahmednagar', 'Chandrapur', 'Parbhani', 'Ichalkaranji', 'Jalna', 'Bhiwandi', 'Panvel',
      'Satara', 'Beed', 'Yavatmal', 'Dharashiv', 'Nandurbar', 'Wardha', 'Ratnagiri',
      'Mira-Bhayandar', 'Ulhasnagar', 'Malegaon', 'Gondia', 'Baramati',
    ],
  },
  { state: 'Manipur', cities: ['Imphal', 'Thoubal'] },
  { state: 'Meghalaya', cities: ['Shillong', 'Tura'] },
  { state: 'Mizoram', cities: ['Aizawl', 'Lunglei'] },
  { state: 'Nagaland', cities: ['Kohima', 'Dimapur'] },
  {
    state: 'Odisha',
    cities: [
      'Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore',
      'Baripada', 'Bhadrak', 'Jharsuguda', 'Angul', 'Jeypore', 'Rayagada',
    ],
  },
  {
    state: 'Punjab',
    cities: [
      'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Hoshiarpur',
      'Pathankot', 'Moga', 'Batala', 'Firozpur', 'Barnala', 'Khanna', 'Phagwara',
      'Sri Muktsar Sahib', 'Rajpura', 'Sangrur', 'Kapurthala',
    ],
  },
  {
    state: 'Rajasthan',
    cities: [
      'Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara', 'Alwar', 'Sikar',
      'Sri Ganganagar', 'Pali', 'Bharatpur', 'Hanumangarh', 'Beawar', 'Tonk', 'Kishangarh',
      'Jhunjhunu', 'Churu', 'Barmer', 'Nagaur', 'Chittorgarh', 'Banswara', 'Jaisalmer', 'Dausa',
      'Bundi', 'Sawai Madhopur',
    ],
  },
  { state: 'Sikkim', cities: ['Gangtok', 'Namchi'] },
  {
    state: 'Tamil Nadu',
    cities: [
      'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur',
      'Erode', 'Vellore', 'Thoothukudi', 'Dindigul', 'Thanjavur', 'Ranipet', 'Sivakasi',
      'Karur', 'Udhagamandalam', 'Hosur', 'Nagercoil', 'Kanchipuram', 'Kumbakonam', 'Cuddalore',
      'Tiruvannamalai', 'Pollachi', 'Rajapalayam', 'Pudukkottai', 'Neyveli', 'Namakkal',
      'Villupuram', 'Karaikudi', 'Ambur',
    ],
  },
  {
    state: 'Telangana',
    cities: [
      'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam',
      'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Suryapet', 'Siddipet', 'Miryalaguda',
      'Secunderabad',
    ],
  },
  { state: 'Tripura', cities: ['Agartala', 'Udaipur', 'Dharmanagar'] },
  {
    state: 'Uttar Pradesh',
    cities: [
      'Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Bareilly',
      'Aligarh', 'Moradabad', 'Saharanpur', 'Gorakhpur', 'Noida', 'Firozabad', 'Jhansi',
      'Muzaffarnagar', 'Mathura', 'Shahjahanpur', 'Rampur', 'Mau', 'Farrukhabad', 'Hapur',
      'Ayodhya', 'Etawah', 'Mirzapur', 'Bulandshahr', 'Sambhal', 'Amroha', 'Hardoi', 'Fatehpur',
      'Raebareli', 'Orai', 'Sitapur', 'Bahraich', 'Unnao', 'Jaunpur', 'Lakhimpur', 'Hathras',
      'Banda', 'Pilibhit', 'Barabanki', 'Gonda', 'Mainpuri', 'Lalitpur', 'Deoria', 'Ghazipur',
      'Sultanpur', 'Azamgarh', 'Bijnor', 'Basti', 'Greater Noida', 'Pratapgarh', 'Hamirpur',
    ],
  },
  {
    state: 'Uttarakhand',
    cities: [
      'Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh',
      'Nainital', 'Pithoragarh', 'Mussoorie',
    ],
  },
  {
    state: 'West Bengal',
    cities: [
      'Kolkata', 'Asansol', 'Siliguri', 'Durgapur', 'Bardhaman', 'Malda', 'Baharampur',
      'Habra', 'Kharagpur', 'Shantipur', 'Haldia', 'Raiganj', 'Krishnanagar', 'Nabadwip',
      'Medinipur', 'Jalpaiguri', 'Balurghat', 'Basirhat', 'Bankura', 'Chakdaha', 'Darjeeling',
      'Alipurduar', 'Purulia', 'Cooch Behar', 'Howrah',
    ],
  },

  // Union territories
  { state: 'Delhi', cities: ['Delhi', 'New Delhi', 'Dwarka', 'Rohini', 'Najafgarh', 'Narela'] },
  {
    state: 'Jammu and Kashmir',
    cities: ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur', 'Kathua', 'Sopore'],
  },
  { state: 'Ladakh', cities: ['Leh', 'Kargil'] },
  { state: 'Chandigarh', cities: ['Chandigarh'] },
  { state: 'Puducherry', cities: ['Puducherry', 'Karaikal', 'Yanam', 'Mahe'] },
  { state: 'Andaman and Nicobar Islands', cities: ['Port Blair'] },
  { state: 'Dadra and Nagar Haveli and Daman and Diu', cities: ['Silvassa', 'Daman', 'Diu'] },
  { state: 'Lakshadweep', cities: ['Kavaratti'] },
];

/** Cities surfaced first in the directory. Kept small — featuring everything features nothing. */
export const FEATURED_CITIES = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad',
  'Jaipur', 'Lucknow',
];
