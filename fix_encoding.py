f = r'c:\Users\shanu\Documents\Sheildpoint360\compliance-assistant\frontend\src\components\AssessmentIntro.jsx'
with open(f, 'r', encoding='utf-8') as fh:
    lines = fh.readlines()

hero_image_block = [
    '        {/* Hero image */}\n',
    '        <div className="lp__imgWrap">\n',
    '          <div className="lp__imgGlow" aria-hidden="true" />\n',
    '          <img src={heroImage} alt="Compliance dashboard illustration" className="lp__heroImg" />\n',
    '        </div>\n',
    '      </main>\n',
]

# Lines 173-219 (0-indexed: 172-218) are the old dashboard section
new_lines = lines[:172] + hero_image_block + lines[219:]

with open(f, 'w', encoding='utf-8') as fh:
    fh.writelines(new_lines)
print('Done, total lines:', len(new_lines))
