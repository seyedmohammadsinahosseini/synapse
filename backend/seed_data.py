"""Seed data: Persian question bank for the platform."""
from .models import Question

# Subject keys are the canonical Persian names used across the app (see frontend SUBJECTS).
# Display labels are translated in the UI through tSubject().
MATH = "ریاضی"
PHYS = "فیزیک"
CHEM = "شیمی"
BIO = "زیست\u200cشناسی"
LIT = "ادبیات فارسی"
ENG = "زبان انگلیسی"
ARA = "عربی"
REL = "دین و زندگی"

QUESTIONS = [
    # -- Mathematics ---------------------------------------------------
    {"subject": MATH, "type": "mcq", "difficulty": 1,
     "text": "What is the value of 5 + 3 × 2?",
     "options": ["11", "16", "13", "10"], "answer": "0",
     "explanation": "Multiply first: 3 × 2 = 6, then 5 + 6 = 11."},
    {"subject": MATH, "type": "mcq", "difficulty": 2,
     "text": "If 2x + 6 = 14, what is x?",
     "options": ["4", "3", "5", "6"], "answer": "0",
     "explanation": "2x = 8, so x = 4."},
    {"subject": MATH, "type": "mcq", "difficulty": 3,
     "text": "What is the area of a circle with radius 7? (Use π ≈ 22/7)",
     "options": ["154", "144", "164", "152"], "answer": "0",
     "explanation": "Area = πr² = (22/7) × 49 = 154."},
    {"subject": MATH, "type": "fill", "difficulty": 1,
     "text": "The value of 12 ÷ 4 is ____.",
     "answer": "3", "explanation": "12 divided by 4 is 3."},
    {"subject": MATH, "type": "fill", "difficulty": 2,
     "text": "The square root of 144 is ____.",
     "answer": "12", "explanation": "12 × 12 = 144."},
    {"subject": MATH, "type": "essay", "difficulty": 3,
     "text": "Find two consecutive integers whose sum is 31. Show your work.",
     "answer": "15|16|consecutive|sum",
     "explanation": "x + (x + 1) = 31, so 2x = 30 and x = 15. The next integer is 16."},

    # -- Physics -------------------------------------------------------
    {"subject": PHYS, "type": "mcq", "difficulty": 2,
     "text": "What is the SI unit of force?",
     "options": ["Newton", "Joule", "Watt", "Pascal"], "answer": "0",
     "explanation": "Force is measured in newtons (N)."},
    {"subject": PHYS, "type": "mcq", "difficulty": 2,
     "text": "An object travels 100 m in 5 seconds. What is its speed in m/s?",
     "options": ["20", "5", "500", "10"], "answer": "0",
     "explanation": "v = d / t = 100 / 5 = 20 m/s."},
    {"subject": PHYS, "type": "fill", "difficulty": 2,
     "text": "A 2 kg object is acted on by a net force of 10 N. Its acceleration is ____ m/s².",
     "answer": "5", "explanation": "a = F / m = 10 / 2 = 5 m/s²."},
    {"subject": PHYS, "type": "essay", "difficulty": 3,
     "text": "State Newton's second law and illustrate it with a numerical example.",
     "answer": "force|acceleration|mass|F=ma|newton",
     "explanation": "F = ma. For a 2 kg mass accelerating at 3 m/s², the force is 6 N."},
    {"subject": PHYS, "type": "mcq", "difficulty": 3,
     "text": "What is the kinetic energy of a 2 kg object moving at 4 m/s?",
     "options": ["16 J", "8 J", "32 J", "4 J"], "answer": "0",
     "explanation": "KE = ½mv² = ½ × 2 × 16 = 16 J."},

    # -- Chemistry -----------------------------------------------------
    {"subject": CHEM, "type": "mcq", "difficulty": 1,
     "text": "What is the chemical symbol for oxygen?",
     "options": ["O", "Ox", "O₂", "Oc"], "answer": "0",
     "explanation": "The chemical symbol for oxygen is O."},
    {"subject": CHEM, "type": "mcq", "difficulty": 2,
     "text": "Acidic solutions have a pH that is:",
     "options": ["Less than 7", "Greater than 7", "Equal to 7", "Zero"], "answer": "0",
     "explanation": "Acidic solutions have a pH below 7."},
    {"subject": CHEM, "type": "fill", "difficulty": 1,
     "text": "The chemical formula of water is ____.",
     "answer": "H2O|water",
     "explanation": "Each water molecule has 2 hydrogen atoms and 1 oxygen atom."},
    {"subject": CHEM, "type": "essay", "difficulty": 3,
     "text": "Explain the difference between a mixture and a compound, with an example of each.",
     "answer": "mixture|compound|ratio|fixed",
     "explanation": "A compound has a fixed ratio of elements joined by chemical bonds. A mixture does not."},

    # -- Biology -------------------------------------------------------
    {"subject": BIO, "type": "mcq", "difficulty": 1,
     "text": "What is the basic unit of all living things?",
     "options": ["Cell", "Tissue", "Organ", "Molecule"], "answer": "0",
     "explanation": "The cell is the basic unit of life."},
    {"subject": BIO, "type": "mcq", "difficulty": 2,
     "text": "Which organelle produces most of the energy in a cell?",
     "options": ["Mitochondrion", "Nucleus", "Ribosome", "Membrane"], "answer": "0",
     "explanation": "The mitochondrion is the powerhouse of the cell."},
    {"subject": BIO, "type": "fill", "difficulty": 2,
     "text": "In plants, photosynthesis takes place in an organelle called the ____.",
     "answer": "chloroplast",
     "explanation": "Chloroplasts are the site of photosynthesis."},
    {"subject": BIO, "type": "essay", "difficulty": 4,
     "text": "Briefly describe the main stages of photosynthesis.",
     "answer": "light|chlorophyll|glucose|oxygen|carbon dioxide",
     "explanation": "Using light, water, and CO₂, the plant produces glucose and releases oxygen."},

    # -- Persian Literature --------------------------------------------
    {"subject": LIT, "type": "mcq", "difficulty": 1,
     "text": "Which of these is Iran's great national epic, written by Ferdowsi?",
     "options": ["Shahnameh", "Masnavi", "Divan of Hafez", "Gulistan"], "answer": "0",
     "explanation": "The Shahnameh (Book of Kings) is Ferdowsi's national epic."},
    {"subject": LIT, "type": "mcq", "difficulty": 2,
     "text": "Which literary device is used in: \"The sea boasts of its waves\"?",
     "options": ["Personification", "Simile", "Metaphor", "Allusion"], "answer": "0",
     "explanation": "Giving the sea a human quality (boasting) is personification."},
    {"subject": LIT, "type": "fill", "difficulty": 2,
     "text": "In a ghazal, the poet's pen name usually appears in the final couplet, called the ____.",
     "answer": "maqta|takhallus",
     "explanation": "The final couplet of a ghazal is the maqta, which often contains the takhallus (pen name)."},
    {"subject": LIT, "type": "essay", "difficulty": 3,
     "text": "In two sentences, explain the meaning of the opening couplet of the Shahnameh: \"In the name of God, of soul and wisdom; beyond which thought cannot go.\"",
     "answer": "God|soul|wisdom|creator",
     "explanation": "The opening praises God, the creator of soul and wisdom."},

    # -- English -------------------------------------------------------
    {"subject": ENG, "type": "mcq", "difficulty": 1,
     "text": "Which word is a noun for something you read?",
     "options": ["book", "run", "quickly", "happy"], "answer": "0",
     "explanation": "'Book' is a noun for something you read."},
    {"subject": ENG, "type": "mcq", "difficulty": 2,
     "text": "Choose the correct form: She ___ to school every day.",
     "options": ["goes", "go", "going", "gone"], "answer": "0",
     "explanation": "Present simple, third person singular: goes."},
    {"subject": ENG, "type": "fill", "difficulty": 1,
     "text": "Fill in the blank: This is ___ apple. (a / an)",
     "answer": "an",
     "explanation": "Use 'an' before a vowel sound."},

    # -- Arabic --------------------------------------------------------
    {"subject": ARA, "type": "mcq", "difficulty": 1,
     "text": "What is the singular of the Arabic word «kutub» (books)?",
     "options": ["kitāb", "kutub", "kātib", "maktūb"], "answer": "0",
     "explanation": "The singular of kutub is kitāb (book)."},
    {"subject": ARA, "type": "mcq", "difficulty": 2,
     "text": "What does the Arabic verb «ذَهَبَ» (dhahaba) mean?",
     "options": ["He went", "He came", "He said", "He saw"], "answer": "0",
     "explanation": "ذَهَبَ (dhahaba) means 'he went'."},
    {"subject": ARA, "type": "fill", "difficulty": 2,
     "text": "Translate «أنا طالب»: I am a ____.",
     "answer": "student|pupil",
     "explanation": "طالب (ṭālib) means student."},

    # -- Religion and Life ---------------------------------------------
    {"subject": REL, "type": "mcq", "difficulty": 1,
     "text": "Which is the first surah of the Quran?",
     "options": ["Al-Fatiha", "Al-Baqara", "An-Nas", "Al-Ikhlas"], "answer": "0",
     "explanation": "Surah Al-Fatiha (The Opening) is the first surah."},
    {"subject": REL, "type": "fill", "difficulty": 2,
     "text": "The name of the Prophet of Islam (PBUH) is ____.",
     "answer": "Muhammad",
     "explanation": "The Prophet of Islam is Muhammad (PBUH)."},
    {"subject": ENG, "type": "essay", "difficulty": 3,
     "text": "Write three sentences about your daily routine in English.",
     "answer": "get up|study|school|breakfast|morning",
     "explanation": "Simple present sentences with the subject 'I' are enough here."},
]


def seed_questions(db):
    if db.query(Question).count() > 0:
        return 0
    for q in QUESTIONS:
        db.add(Question(**q))
    db.commit()
    return len(QUESTIONS)
