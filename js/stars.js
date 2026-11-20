// =====================================================================
//  stars.js — 밝은 별 목록 (J2000.0 분점 기준 적경·적위)
//  [영문 이름, 한글 이름, 바이어 부호, 별자리 약자, 적경 "h m s", 적위 "° ′ ″", 겉보기 등급, 분광형]
// =====================================================================

const RAW = [
  ['Sirius', '시리우스', 'α CMa', 'CMa', '06 45 08.9', '-16 42 58', -1.46, 'A'],
  ['Canopus', '카노푸스', 'α Car', 'Car', '06 23 57.1', '-52 41 45', -0.74, 'F'],
  ['Rigil Kentaurus', '리길 켄타우루스', 'α Cen', 'Cen', '14 39 36.5', '-60 50 02', -0.27, 'G'],
  ['Arcturus', '아크투루스', 'α Boo', 'Boo', '14 15 39.7', '+19 10 57', -0.05, 'K'],
  ['Vega', '베가(직녀성)', 'α Lyr', 'Lyr', '18 36 56.3', '+38 47 01', 0.03, 'A'],
  ['Capella', '카펠라', 'α Aur', 'Aur', '05 16 41.4', '+45 59 53', 0.08, 'G'],
  ['Rigel', '리겔', 'β Ori', 'Ori', '05 14 32.3', '-08 12 06', 0.13, 'B'],
  ['Procyon', '프로키온', 'α CMi', 'CMi', '07 39 18.1', '+05 13 30', 0.34, 'F'],
  ['Achernar', '아케르나르', 'α Eri', 'Eri', '01 37 42.8', '-57 14 12', 0.46, 'B'],
  ['Betelgeuse', '베텔게우스', 'α Ori', 'Ori', '05 55 10.3', '+07 24 25', 0.50, 'M'],
  ['Hadar', '하다르', 'β Cen', 'Cen', '14 03 49.4', '-60 22 23', 0.61, 'B'],
  ['Altair', '알타이르(견우성)', 'α Aql', 'Aql', '19 50 47.0', '+08 52 06', 0.76, 'A'],
  ['Acrux', '아크룩스', 'α Cru', 'Cru', '12 26 35.9', '-63 05 57', 0.76, 'B'],
  ['Aldebaran', '알데바란', 'α Tau', 'Tau', '04 35 55.2', '+16 30 33', 0.86, 'K'],
  ['Antares', '안타레스', 'α Sco', 'Sco', '16 29 24.4', '-26 25 55', 0.96, 'M'],
  ['Spica', '스피카', 'α Vir', 'Vir', '13 25 11.6', '-11 09 41', 0.97, 'B'],
  ['Pollux', '폴룩스', 'β Gem', 'Gem', '07 45 18.9', '+28 01 34', 1.14, 'K'],
  ['Fomalhaut', '포말하우트', 'α PsA', 'PsA', '22 57 39.0', '-29 37 20', 1.16, 'A'],
  ['Deneb', '데네브', 'α Cyg', 'Cyg', '20 41 25.9', '+45 16 49', 1.25, 'A'],
  ['Mimosa', '미모사', 'β Cru', 'Cru', '12 47 43.3', '-59 41 19', 1.25, 'B'],
  ['Regulus', '레굴루스', 'α Leo', 'Leo', '10 08 22.3', '+11 58 02', 1.40, 'B'],
  ['Adhara', '아다라', 'ε CMa', 'CMa', '06 58 37.5', '-28 58 20', 1.50, 'B'],
  ['Castor', '카스토르', 'α Gem', 'Gem', '07 34 36.0', '+31 53 18', 1.58, 'A'],
  ['Shaula', '샤울라', 'λ Sco', 'Sco', '17 33 36.5', '-37 06 14', 1.62, 'B'],
  ['Gacrux', '가크룩스', 'γ Cru', 'Cru', '12 31 09.9', '-57 06 48', 1.63, 'M'],
  ['Bellatrix', '벨라트릭스', 'γ Ori', 'Ori', '05 25 07.9', '+06 20 59', 1.64, 'B'],
  ['Elnath', '엘나트', 'β Tau', 'Tau', '05 26 17.5', '+28 36 27', 1.65, 'B'],
  ['Miaplacidus', '미아플라키두스', 'β Car', 'Car', '09 13 12.0', '-69 43 02', 1.67, 'A'],
  ['Alnilam', '알닐람', 'ε Ori', 'Ori', '05 36 12.8', '-01 12 07', 1.69, 'B'],
  ['Alnair', '알나이르', 'α Gru', 'Gru', '22 08 14.0', '-46 57 40', 1.74, 'B'],
  ['Alnitak', '알니탁', 'ζ Ori', 'Ori', '05 40 45.5', '-01 56 34', 1.77, 'O'],
  ['Alioth', '알리오트', 'ε UMa', 'UMa', '12 54 01.7', '+55 57 35', 1.77, 'A'],
  ['Dubhe', '두베', 'α UMa', 'UMa', '11 03 43.7', '+61 45 03', 1.79, 'K'],
  ['Mirfak', '미르파크', 'α Per', 'Per', '03 24 19.4', '+49 51 40', 1.79, 'F'],
  ['Wezen', '웨젠', 'δ CMa', 'CMa', '07 08 23.5', '-26 23 36', 1.84, 'F'],
  ['Regor', '레고르', 'γ Vel', 'Vel', '08 09 31.95', '-47 20 12', 1.83, 'O'],
  ['Kaus Australis', '카우스 아우스트랄리스', 'ε Sgr', 'Sgr', '18 24 10.3', '-34 23 05', 1.85, 'B'],
  ['Sargas', '사르가스', 'θ Sco', 'Sco', '17 37 19.1', '-42 59 52', 1.86, 'F'],
  ['Avior', '아비오르', 'ε Car', 'Car', '08 22 30.8', '-59 30 34', 1.86, 'K'],
  ['Alkaid', '알카이드', 'η UMa', 'UMa', '13 47 32.4', '+49 18 48', 1.86, 'B'],
  ['Menkalinan', '멘칼리난', 'β Aur', 'Aur', '05 59 31.7', '+44 56 51', 1.90, 'A'],
  ['Atria', '아트리아', 'α TrA', 'TrA', '16 48 39.9', '-69 01 40', 1.91, 'K'],
  ['Alhena', '알헤나', 'γ Gem', 'Gem', '06 37 42.7', '+16 23 57', 1.92, 'A'],
  ['Peacock', '피콕', 'α Pav', 'Pav', '20 25 38.9', '-56 44 06', 1.94, 'B'],
  ['Delta Velorum', '델타 벨로룸', 'δ Vel', 'Vel', '08 44 42.2', '-54 42 30', 1.96, 'A'],
  ['Polaris', '폴라리스(북극성)', 'α UMi', 'UMi', '02 31 49.1', '+89 15 51', 1.98, 'F'],
  ['Mirzam', '미르잠', 'β CMa', 'CMa', '06 22 42.0', '-17 57 21', 1.98, 'B'],
  ['Alphard', '알파르드', 'α Hya', 'Hya', '09 27 35.2', '-08 39 31', 1.98, 'K'],
  ['Hamal', '하말', 'α Ari', 'Ari', '02 07 10.4', '+23 27 45', 2.00, 'K'],
  ['Algieba', '알기에바', 'γ Leo', 'Leo', '10 19 58.4', '+19 50 29', 2.01, 'K'],
  ['Diphda', '디프다', 'β Cet', 'Cet', '00 43 35.4', '-17 59 12', 2.04, 'K'],
  ['Nunki', '눈키', 'σ Sgr', 'Sgr', '18 55 15.9', '-26 17 48', 2.05, 'B'],
  ['Menkent', '멘켄트', 'θ Cen', 'Cen', '14 06 40.9', '-36 22 12', 2.06, 'K'],
  ['Mirach', '미라크', 'β And', 'And', '01 09 43.9', '+35 37 14', 2.06, 'M'],
  ['Alpheratz', '알페라츠', 'α And', 'And', '00 08 23.3', '+29 05 26', 2.06, 'B'],
  ['Rasalhague', '라스알하게', 'α Oph', 'Oph', '17 34 56.1', '+12 33 36', 2.08, 'A'],
  ['Kochab', '코카브', 'β UMi', 'UMi', '14 50 42.3', '+74 09 20', 2.08, 'K'],
  ['Saiph', '사이프', 'κ Ori', 'Ori', '05 47 45.4', '-09 40 11', 2.09, 'B'],
  ['Almach', '알마크', 'γ And', 'And', '02 03 54.0', '+42 19 47', 2.10, 'K'],
  ['Algol', '알골', 'β Per', 'Per', '03 08 10.1', '+40 57 20', 2.12, 'B'],
  ['Denebola', '데네볼라', 'β Leo', 'Leo', '11 49 03.6', '+14 34 19', 2.14, 'A'],
  ['Suhail', '수하일', 'λ Vel', 'Vel', '09 07 59.8', '-43 25 57', 2.21, 'K'],
  ['Mintaka', '민타카', 'δ Ori', 'Ori', '05 32 00.4', '-00 17 57', 2.23, 'O'],
  ['Mizar', '미자르', 'ζ UMa', 'UMa', '13 23 55.5', '+54 55 31', 2.23, 'A'],
  ['Sadr', '사드르', 'γ Cyg', 'Cyg', '20 22 13.7', '+40 15 24', 2.23, 'F'],
  ['Eltanin', '엘타닌', 'γ Dra', 'Dra', '17 56 36.4', '+51 29 20', 2.23, 'K'],
  ['Alphecca', '알페카', 'α CrB', 'CrB', '15 34 41.3', '+26 42 53', 2.23, 'A'],
  ['Schedar', '쉐다르', 'α Cas', 'Cas', '00 40 30.4', '+56 32 14', 2.24, 'K'],
  ['Naos', '나오스', 'ζ Pup', 'Pup', '08 03 35.0', '-40 00 12', 2.25, 'O'],
  ['Caph', '카프', 'β Cas', 'Cas', '00 09 10.7', '+59 08 59', 2.28, 'F'],
  ['Dschubba', '주바', 'δ Sco', 'Sco', '16 00 20.0', '-22 37 18', 2.29, 'B'],
  ['Larawag', '라라와그', 'ε Sco', 'Sco', '16 50 09.8', '-34 17 36', 2.29, 'K'],
  ['Merak', '메라크', 'β UMa', 'UMa', '11 01 50.5', '+56 22 57', 2.37, 'A'],
  ['Izar', '이자르', 'ε Boo', 'Boo', '14 44 59.2', '+27 04 27', 2.37, 'K'],
  ['Enif', '에니프', 'ε Peg', 'Peg', '21 44 11.2', '+09 52 30', 2.39, 'K'],
  ['Girtab', '기르타브', 'κ Sco', 'Sco', '17 42 29.3', '-39 01 48', 2.39, 'B'],
  ['Ankaa', '앙카', 'α Phe', 'Phe', '00 26 17.0', '-42 18 22', 2.40, 'K'],
  ['Scheat', '쉐아트', 'β Peg', 'Peg', '23 03 46.5', '+28 04 58', 2.42, 'M'],
  ['Sabik', '사비크', 'η Oph', 'Oph', '17 10 22.7', '-15 43 29', 2.43, 'A'],
  ['Phecda', '페크다', 'γ UMa', 'UMa', '11 53 49.8', '+53 41 41', 2.44, 'A'],
  ['Aludra', '알루드라', 'η CMa', 'CMa', '07 24 05.7', '-29 18 11', 2.45, 'B'],
  ['Alderamin', '알데라민', 'α Cep', 'Cep', '21 18 34.8', '+62 35 08', 2.45, 'A'],
  ['Navi', '나비', 'γ Cas', 'Cas', '00 56 42.5', '+60 43 00', 2.47, 'B'],
  ['Gienah Cygni', '기에나(백조)', 'ε Cyg', 'Cyg', '20 46 12.7', '+33 58 13', 2.48, 'K'],
  ['Markab', '마르카브', 'α Peg', 'Peg', '23 04 45.7', '+15 12 19', 2.49, 'B'],
  ['Menkar', '멘카르', 'α Cet', 'Cet', '03 02 16.8', '+04 05 23', 2.53, 'M'],
  ['Zosma', '조스마', 'δ Leo', 'Leo', '11 14 06.5', '+20 31 25', 2.56, 'A'],
  ['Gienah', '기에나(까마귀)', 'γ Crv', 'Crv', '12 15 48.4', '-17 32 31', 2.59, 'B'],
  ['Ascella', '아스켈라', 'ζ Sgr', 'Sgr', '19 02 36.7', '-29 52 48', 2.60, 'A'],
  ['Zubeneschamali', '주베네샤말리', 'β Lib', 'Lib', '15 17 00.4', '-09 22 59', 2.61, 'B'],
  ['Acrab', '아크라브', 'β Sco', 'Sco', '16 05 26.2', '-19 48 20', 2.62, 'B'],
  ['Mahasim', '마하심', 'θ Aur', 'Aur', '05 59 43.3', '+37 12 45', 2.62, 'A'],
  ['Unukalhai', '우누칼하이', 'α Ser', 'Ser', '15 44 16.1', '+06 25 32', 2.63, 'K'],
  ['Sheratan', '쉐라탄', 'β Ari', 'Ari', '01 54 38.4', '+20 48 29', 2.64, 'A'],
  ['Kraz', '크라즈', 'β Crv', 'Crv', '12 34 23.2', '-23 23 48', 2.65, 'G'],
  ['Ruchbah', '루크바', 'δ Cas', 'Cas', '01 25 49.0', '+60 14 07', 2.68, 'A'],
  ['Muphrid', '무프리드', 'η Boo', 'Boo', '13 54 41.1', '+18 23 52', 2.68, 'G'],
  ['Hassaleh', '하살레', 'ι Aur', 'Aur', '04 56 59.6', '+33 09 58', 2.69, 'K'],
  ['Lesath', '레사트', 'υ Sco', 'Sco', '17 30 45.8', '-37 17 45', 2.70, 'B'],
  ['Kaus Media', '카우스 메디아', 'δ Sgr', 'Sgr', '18 20 59.6', '-29 49 41', 2.70, 'K'],
  ['Tarazed', '타라제드', 'γ Aql', 'Aql', '19 46 15.6', '+10 36 48', 2.72, 'K'],
  ['Porrima', '포리마', 'γ Vir', 'Vir', '12 41 39.6', '-01 26 58', 2.74, 'F'],
  ['Zubenelgenubi', '주베넬제누비', 'α Lib', 'Lib', '14 50 52.7', '-16 02 30', 2.75, 'A'],
  ['Kornephoros', '코르네포로스', 'β Her', 'Her', '16 30 13.2', '+21 29 23', 2.77, 'G'],
  ['Rastaban', '라스타반', 'β Dra', 'Dra', '17 30 25.96', '+52 18 05', 2.79, 'G'],
  ['Imai', '이마이', 'δ Cru', 'Cru', '12 15 08.7', '-58 44 56', 2.79, 'B'],
  ['Kaus Borealis', '카우스 보레알리스', 'λ Sgr', 'Sgr', '18 27 58.2', '-25 25 18', 2.81, 'K'],
  ['Zeta Herculis', '제타 헤르쿨리스', 'ζ Her', 'Her', '16 41 17.2', '+31 36 10', 2.81, 'G'],
  ['Paikauhale', '파이카우할레', 'τ Sco', 'Sco', '16 35 52.95', '-28 12 58', 2.82, 'B'],
  ['Algenib', '알게니브', 'γ Peg', 'Peg', '00 13 14.2', '+15 11 01', 2.83, 'B'],
  ['Vindemiatrix', '빈데미아트릭스', 'ε Vir', 'Vir', '13 02 10.6', '+10 57 33', 2.85, 'G'],
  ['Deneb Algedi', '데네브 알게디', 'δ Cap', 'Cap', '21 47 02.4', '-16 07 38', 2.85, 'A'],
  ['Alcyone', '알키오네(플레이아데스)', 'η Tau', 'Tau', '03 47 29.1', '+24 06 18', 2.87, 'B'],
  ['Fawaris', '파와리스', 'δ Cyg', 'Cyg', '19 44 58.5', '+45 07 51', 2.87, 'B'],
  ['Tejat', '테자트', 'μ Gem', 'Gem', '06 22 57.6', '+22 30 49', 2.88, 'M'],
  ['Fang', '팡', 'π Sco', 'Sco', '15 58 51.1', '-26 06 51', 2.89, 'B'],
  ['Alniyat', '알니야트', 'σ Sco', 'Sco', '16 21 11.3', '-25 35 34', 2.89, 'B'],
  ['Gomeisa', '고메이사', 'β CMi', 'CMi', '07 27 09.0', '+08 17 22', 2.89, 'B'],
  ['Sadalsuud', '사달수드', 'β Aqr', 'Aqr', '21 31 33.5', '-05 34 16', 2.90, 'G'],
  ['Cor Caroli', '코르 카롤리', 'α CVn', 'CVn', '12 56 01.7', '+38 19 06', 2.90, 'A'],
  ['Algorab', '알고라브', 'δ Crv', 'Crv', '12 29 51.9', '-16 30 56', 2.95, 'B'],
  ['Sadalmelik', '사달멜리크', 'α Aqr', 'Aqr', '22 05 47.0', '-00 19 11', 2.95, 'G'],
  ['Tianguan', '톈관', 'ζ Tau', 'Tau', '05 37 38.7', '+21 08 33', 2.97, 'B'],
  ['Mebsuta', '메브수타', 'ε Gem', 'Gem', '06 43 55.9', '+25 07 52', 2.98, 'G'],
  ['Epsilon Leonis', '엡실론 레오니스', 'ε Leo', 'Leo', '09 45 51.1', '+23 46 27', 2.98, 'G'],
  ['Alnasl', '알나슬', 'γ² Sgr', 'Sgr', '18 05 48.5', '-30 25 27', 2.99, 'K'],
  ['Almaaz', '알마즈', 'ε Aur', 'Aur', '05 01 58.1', '+43 49 24', 2.99, 'F'],
  ['Iota Scorpii', '이오타 스코르피', 'ι¹ Sco', 'Sco', '17 47 35.1', '-40 07 37', 2.99, 'F'],
  ['Pherkad', '페르카드', 'γ UMi', 'UMi', '15 20 43.7', '+71 50 02', 3.00, 'A'],
  ['Minkar', '민카르', 'ε Crv', 'Crv', '12 10 07.5', '-22 37 11', 3.00, 'K'],
  ['Xamidimura', '사미디무라', 'μ¹ Sco', 'Sco', '16 51 52.2', '-38 02 51', 3.00, 'B'],
  ['Mira', '미라', 'ο Cet', 'Cet', '02 19 20.8', '-02 58 39', 3.04, 'M'],
  ['Seginus', '세기누스', 'γ Boo', 'Boo', '14 32 04.7', '+38 18 30', 3.03, 'A'],
  ['Albireo', '알비레오', 'β Cyg', 'Cyg', '19 30 43.3', '+27 57 35', 3.05, 'K'],
  ['Dabih', '다비', 'β Cap', 'Cap', '20 21 00.7', '-14 46 53', 3.05, 'G'],
  ['Pi Herculis', '파이 헤르쿨리스', 'π Her', 'Her', '17 15 02.8', '+36 48 33', 3.16, 'K'],
  ['Phi Sagittarii', '파이 사기타리', 'φ Sgr', 'Sgr', '18 45 39.4', '-26 59 27', 3.17, 'B'],
  ['Errai', '에라이', 'γ Cep', 'Cep', '23 39 20.8', '+77 37 57', 3.21, 'K'],
  ['Alfirk', '알피르크', 'β Cep', 'Cep', '21 28 39.6', '+70 33 39', 3.23, 'B'],
  ['Sulafat', '술라파트', 'γ Lyr', 'Lyr', '18 58 56.6', '+32 41 22', 3.25, 'B'],
  ['Megrez', '메그레즈', 'δ UMa', 'UMa', '12 15 25.6', '+57 01 57', 3.31, 'A'],
  ['Eta Scorpii', '에타 스코르피', 'η Sco', 'Sco', '17 12 09.2', '-43 14 21', 3.32, 'F'],
  ['Tau Sagittarii', '타우 사기타리', 'τ Sgr', 'Sgr', '19 06 56.4', '-27 40 13', 3.32, 'K'],
  ['Chertan', '케르탄', 'θ Leo', 'Leo', '11 14 14.4', '+15 25 46', 3.33, 'A'],
  ['Zeta Cephei', '제타 케페이', 'ζ Cep', 'Cep', '22 10 51.3', '+58 12 05', 3.35, 'K'],
  ['Segin', '세긴', 'ε Cas', 'Cas', '01 54 23.7', '+63 40 12', 3.37, 'B'],
  ['Minelauva', '미넬라우바', 'δ Vir', 'Vir', '12 55 36.2', '+03 23 51', 3.38, 'M'],
  ['Meissa', '메이사', 'λ Ori', 'Ori', '05 35 08.3', '+09 56 03', 3.39, 'O'],
  ['Adhafera', '아다페라', 'ζ Leo', 'Leo', '10 16 41.4', '+23 25 02', 3.43, 'F'],
  ['Delta Bootis', '델타 보오티스', 'δ Boo', 'Boo', '15 15 30.2', '+33 18 53', 3.47, 'G'],
  ['Eta Herculis', '에타 헤르쿨리스', 'η Her', 'Her', '16 42 53.8', '+38 55 20', 3.48, 'G'],
  ['Eta Leonis', '에타 레오니스', 'η Leo', 'Leo', '10 07 19.95', '+16 45 45', 3.49, 'A'],
  ['Nekkar', '네카르', 'β Boo', 'Boo', '15 01 56.8', '+40 23 26', 3.50, 'G'],
  ['Sheliak', '쉘리아크', 'β Lyr', 'Lyr', '18 50 04.8', '+33 21 46', 3.52, 'B'],
  ['Iota Cephei', '이오타 케페이', 'ι Cep', 'Cep', '22 49 40.8', '+66 12 01', 3.52, 'K'],
  ['Wasat', '와사트', 'δ Gem', 'Gem', '07 20 07.4', '+21 58 56', 3.53, 'F'],
  ['Algedi', '알게디', 'α² Cap', 'Cap', '20 18 03.3', '-12 32 41', 3.57, 'G'],
  ['Zavijava', '자위야와', 'β Vir', 'Vir', '11 50 41.7', '+01 45 53', 3.61, 'F'],
  ['Zeta Scorpii', '제타 스코르피', 'ζ² Sco', 'Sco', '16 54 35.0', '-42 21 41', 3.62, 'K'],
  ['Thuban', '투반', 'α Dra', 'Dra', '14 04 23.3', '+64 22 33', 3.65, 'A'],
  ['Nashira', '나시라', 'γ Cap', 'Cap', '21 40 05.5', '-16 39 45', 3.68, 'A'],
  ['Alshain', '알샤인', 'β Aql', 'Aql', '19 55 18.8', '+06 24 24', 3.71, 'G'],
  ['Rasalas', '라스알라스', 'μ Leo', 'Leo', '09 52 45.8', '+26 00 25', 3.88, 'K'],
  ['Epsilon Herculis', '엡실론 헤르쿨리스', 'ε Her', 'Her', '17 00 17.4', '+30 55 35', 3.92, 'A'],
  ['Delta Cephei', '델타 케페이', 'δ Cep', 'Cep', '22 29 10.3', '+58 24 55', 4.07, 'F'],
  ['Epsilon UMi', '엡실론 작은곰', 'ε UMi', 'UMi', '16 45 58.2', '+82 02 14', 4.21, 'G'],
  ['Zeta UMi', '제타 작은곰', 'ζ UMi', 'UMi', '15 44 03.5', '+77 47 40', 4.32, 'A'],
  ['Yildun', '일둔', 'δ UMi', 'UMi', '17 32 12.99', '+86 35 11', 4.35, 'A'],
  ['Eta UMi', '에타 작은곰', 'η UMi', 'UMi', '16 17 30.3', '+75 45 19', 4.95, 'F'],
  ['Polaris Australis', '남극성(시그마 옥탄스)', 'σ Oct', 'Oct', '21 08 46.9', '-88 57 23', 5.42, 'F'],
];

function parseHMS(s) {
  const [h, m, sec] = s.split(/\s+/).map(Number);
  return (h + m / 60 + sec / 3600) * 15;
}
function parseDMS(s) {
  const neg = s.trim().startsWith('-');
  const [d, m, sec] = s.replace(/^[+-]/, '').split(/\s+/).map(Number);
  const v = d + m / 60 + sec / 3600;
  return neg ? -v : v;
}

export const STARS = RAW.map(([en, ko, bayer, con, ra, dec, mag, sp], i) => ({
  id: i, en, ko, bayer, con,
  ra: parseHMS(ra), dec: parseDMS(dec), mag, sp,
}));
export const STAR_BY_NAME = Object.fromEntries(STARS.map((s) => [s.en, s]));

export const SP_COLOR = {
  O: '#9db4ff', B: '#aec3ff', A: '#d5e0ff', F: '#f8f7ff', G: '#fff1dc', K: '#ffd29c', M: '#ffb06a',
};

// 별자리 선 (영문 이름 쌍)
export const CON_LINES = [
  // 큰곰자리 — 북두칠성
  ['Dubhe', 'Merak'], ['Merak', 'Phecda'], ['Phecda', 'Megrez'], ['Megrez', 'Dubhe'],
  ['Megrez', 'Alioth'], ['Alioth', 'Mizar'], ['Mizar', 'Alkaid'],
  // 작은곰자리
  ['Polaris', 'Yildun'], ['Yildun', 'Epsilon UMi'], ['Epsilon UMi', 'Zeta UMi'], ['Zeta UMi', 'Kochab'],
  ['Kochab', 'Pherkad'], ['Pherkad', 'Eta UMi'], ['Eta UMi', 'Zeta UMi'],
  // 카시오페이아자리
  ['Caph', 'Schedar'], ['Schedar', 'Navi'], ['Navi', 'Ruchbah'], ['Ruchbah', 'Segin'],
  // 케페우스자리
  ['Alderamin', 'Alfirk'], ['Alfirk', 'Errai'], ['Errai', 'Iota Cephei'], ['Iota Cephei', 'Zeta Cephei'],
  ['Zeta Cephei', 'Alderamin'], ['Iota Cephei', 'Alderamin'], ['Zeta Cephei', 'Delta Cephei'],
  // 오리온자리
  ['Meissa', 'Betelgeuse'], ['Meissa', 'Bellatrix'], ['Betelgeuse', 'Bellatrix'], ['Betelgeuse', 'Alnitak'],
  ['Bellatrix', 'Mintaka'], ['Mintaka', 'Alnilam'], ['Alnilam', 'Alnitak'], ['Alnitak', 'Saiph'], ['Mintaka', 'Rigel'],
  // 큰개자리, 작은개자리
  ['Sirius', 'Mirzam'], ['Sirius', 'Wezen'], ['Wezen', 'Adhara'], ['Wezen', 'Aludra'],
  ['Procyon', 'Gomeisa'],
  // 쌍둥이자리
  ['Castor', 'Pollux'], ['Castor', 'Mebsuta'], ['Mebsuta', 'Tejat'], ['Pollux', 'Wasat'], ['Wasat', 'Alhena'],
  // 황소자리, 마차부자리
  ['Aldebaran', 'Elnath'], ['Aldebaran', 'Tianguan'],
  ['Capella', 'Menkalinan'], ['Menkalinan', 'Mahasim'], ['Mahasim', 'Elnath'], ['Elnath', 'Hassaleh'],
  ['Hassaleh', 'Almaaz'], ['Almaaz', 'Capella'],
  // 사자자리
  ['Regulus', 'Eta Leonis'], ['Eta Leonis', 'Algieba'], ['Algieba', 'Adhafera'], ['Adhafera', 'Rasalas'],
  ['Rasalas', 'Epsilon Leonis'], ['Algieba', 'Zosma'], ['Zosma', 'Denebola'], ['Denebola', 'Chertan'],
  ['Chertan', 'Regulus'], ['Zosma', 'Chertan'],
  // 목동자리, 처녀자리, 까마귀자리, 천칭자리
  ['Arcturus', 'Izar'], ['Izar', 'Delta Bootis'], ['Delta Bootis', 'Nekkar'], ['Nekkar', 'Seginus'],
  ['Seginus', 'Arcturus'], ['Arcturus', 'Muphrid'],
  ['Spica', 'Porrima'], ['Porrima', 'Minelauva'], ['Minelauva', 'Vindemiatrix'], ['Porrima', 'Zavijava'],
  ['Gienah', 'Algorab'], ['Algorab', 'Kraz'], ['Kraz', 'Minkar'], ['Minkar', 'Gienah'],
  ['Zubenelgenubi', 'Zubeneschamali'],
  // 전갈자리
  ['Acrab', 'Dschubba'], ['Dschubba', 'Fang'], ['Dschubba', 'Alniyat'], ['Alniyat', 'Antares'],
  ['Antares', 'Paikauhale'], ['Paikauhale', 'Larawag'], ['Larawag', 'Xamidimura'], ['Xamidimura', 'Zeta Scorpii'],
  ['Zeta Scorpii', 'Eta Scorpii'], ['Eta Scorpii', 'Sargas'], ['Sargas', 'Iota Scorpii'], ['Iota Scorpii', 'Girtab'],
  ['Girtab', 'Shaula'], ['Shaula', 'Lesath'],
  // 궁수자리 (주전자)
  ['Kaus Australis', 'Kaus Media'], ['Kaus Media', 'Kaus Borealis'], ['Kaus Borealis', 'Phi Sagittarii'],
  ['Phi Sagittarii', 'Nunki'], ['Nunki', 'Tau Sagittarii'], ['Tau Sagittarii', 'Ascella'], ['Ascella', 'Phi Sagittarii'],
  ['Ascella', 'Kaus Australis'], ['Kaus Australis', 'Alnasl'], ['Alnasl', 'Kaus Media'], ['Phi Sagittarii', 'Kaus Media'],
  // 여름의 대삼각형 별자리
  ['Vega', 'Sheliak'], ['Vega', 'Sulafat'], ['Sheliak', 'Sulafat'],
  ['Deneb', 'Sadr'], ['Sadr', 'Albireo'], ['Sadr', 'Gienah Cygni'], ['Sadr', 'Fawaris'],
  ['Altair', 'Tarazed'], ['Altair', 'Alshain'],
  // 헤르쿨레스자리
  ['Zeta Herculis', 'Eta Herculis'], ['Eta Herculis', 'Pi Herculis'], ['Pi Herculis', 'Epsilon Herculis'],
  ['Epsilon Herculis', 'Zeta Herculis'], ['Zeta Herculis', 'Kornephoros'],
  // 용자리 머리
  ['Eltanin', 'Rastaban'],
  // 페가수스·안드로메다·페르세우스·양
  ['Markab', 'Scheat'], ['Scheat', 'Alpheratz'], ['Alpheratz', 'Algenib'], ['Algenib', 'Markab'], ['Markab', 'Enif'],
  ['Alpheratz', 'Mirach'], ['Mirach', 'Almach'], ['Mirfak', 'Algol'], ['Hamal', 'Sheratan'],
  // 염소·물병
  ['Algedi', 'Dabih'], ['Dabih', 'Deneb Algedi'], ['Deneb Algedi', 'Nashira'], ['Nashira', 'Algedi'],
  ['Sadalmelik', 'Sadalsuud'],
  // 남십자자리, 센타우루스
  ['Acrux', 'Gacrux'], ['Mimosa', 'Imai'], ['Rigil Kentaurus', 'Hadar'],
];

export const CONSTELLATIONS = {
  UMa: '큰곰자리', UMi: '작은곰자리', Cas: '카시오페이아자리', Cep: '케페우스자리', Ori: '오리온자리',
  CMa: '큰개자리', CMi: '작은개자리', Gem: '쌍둥이자리', Tau: '황소자리', Aur: '마차부자리',
  Leo: '사자자리', Boo: '목동자리', Vir: '처녀자리', Crv: '까마귀자리', Lib: '천칭자리',
  Sco: '전갈자리', Sgr: '궁수자리', Lyr: '거문고자리', Cyg: '백조자리', Aql: '독수리자리',
  Her: '헤르쿨레스자리', Dra: '용자리', Peg: '페가수스자리', And: '안드로메다자리', Per: '페르세우스자리',
  Ari: '양자리', Cap: '염소자리', Aqr: '물병자리', Cru: '남십자자리', Cen: '센타우루스자리',
  Car: '용골자리', Vel: '돛자리', PsA: '남쪽물고기자리', Eri: '에리다누스자리', Cet: '고래자리',
  Oph: '뱀주인자리', CrB: '북쪽왕관자리', Hya: '바다뱀자리', Gru: '두루미자리', Pav: '공작자리',
  TrA: '남쪽삼각형자리', Pup: '고물자리', Phe: '봉황새자리', Ser: '뱀자리', CVn: '사냥개자리', Oct: '팔분의자리',
};

/** 별자리 이름 라벨 위치: 별자리 선에 쓰인 별들의 평균 방향 */
export function constellationCenters() {
  const acc = {};
  const used = new Set(CON_LINES.flat());
  for (const s of STARS) {
    if (!used.has(s.en)) continue;
    const c = Math.cos(s.dec * Math.PI / 180);
    const v = [c * Math.cos(s.ra * Math.PI / 180), c * Math.sin(s.ra * Math.PI / 180), Math.sin(s.dec * Math.PI / 180)];
    (acc[s.con] ||= [0, 0, 0, 0]);
    acc[s.con][0] += v[0]; acc[s.con][1] += v[1]; acc[s.con][2] += v[2]; acc[s.con][3]++;
  }
  return Object.entries(acc).filter(([, a]) => a[3] >= 2).map(([con, a]) => {
    const n = Math.hypot(a[0], a[1], a[2]);
    return { con, ko: CONSTELLATIONS[con] || con, ra: (Math.atan2(a[1], a[0]) * 180 / Math.PI + 360) % 360, dec: Math.asin(a[2] / n) * 180 / Math.PI };
  });
}
