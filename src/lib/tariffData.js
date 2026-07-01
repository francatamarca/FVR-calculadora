// ── Argentina NCM/AEC tariff rates by 4-digit HS prefix ──────────────────
export const NCM_RATES = {
  // Ch.01-05 Animals & animal products (AEC extrazona; carnes/pescados/lácteos 10-16%)
  "0101":4,"0102":2,"0103":0,"0104":0,"0105":2,"0106":4,
  "0201":10,"0202":10,"0203":10,"0204":10,"0207":10,"0210":10,
  "0301":10,"0302":10,"0303":10,"0304":10,"0305":10,
  "0401":12,"0402":16,"0403":16,"0404":14,"0405":16,"0406":16,
  // Ch.06-14 Vegetables
  "0601":10,"0602":2,"0701":10,"0702":10,"0703":10,"0704":10,"0705":10,
  "0706":10,"0707":10,"0708":10,"0709":10,"0710":10,"0711":10,"0712":10,
  "0901":10,"0902":10,"0903":10,"0904":10,"0905":10,"0906":10,
  // Ch.15 Oils
  "1501":8,"1507":10,"1508":10,"1509":10,"1515":10,"1516":10,
  // Ch.16-24 Food & beverages
  "1601":16,"1602":16,"1901":16,"1902":16,"1904":16,"1905":18,
  "2001":14,"2002":14,"2003":14,"2004":14,"2005":14,
  "2101":16,"2102":14,"2103":16,"2104":16,"2105":18,"2106":16,
  "2201":20,"2202":20,"2203":20,"2204":20,"2205":20,"2206":20,"2207":20,"2208":20,
  // Ch.25-27 Minerals
  "2501":0,"2502":0,"2503":0,"2504":0,"2505":0,"2701":0,"2710":4,"2711":4,
  // Ch.28-38 Chemicals
  "2801":4,"2802":4,"2803":4,"2804":4,"2805":4,"2806":4,"2807":4,
  "2901":2,"2902":2,"2903":4,"2904":4,"2905":4,
  "3001":8,"3002":4,"3003":6,"3004":6,"3005":10,"3006":6,
  "3301":12,"3302":16,"3303":18,"3304":18,"3305":18,"3306":18,"3307":18,
  "3401":14,"3402":12,
  // Ch.39-40 Plastics & rubber
  "3901":8,"3902":8,"3903":8,"3904":8,"3905":8,"3906":8,"3907":8,"3908":8,
  "3909":8,"3910":8,"3911":8,"3912":8,"3913":8,"3914":8,"3915":4,"3916":14,
  "3917":14,"3918":14,"3919":14,"3920":14,"3921":14,"3922":18,"3923":18,"3924":18,
  "3925":18,"3926":18,
  "4001":4,"4002":4,"4005":8,"4006":8,"4007":8,"4008":8,"4009":8,"4010":8,
  "4011":14,"4012":14,"4013":14,"4014":10,"4015":8,"4016":8,
  // Ch.41-43 Leather
  "4101":4,"4102":4,"4103":4,"4104":4,"4105":4,"4106":4,"4107":10,"4108":10,
  "4201":18,"4202":18,"4203":18,"4204":18,"4205":18,"4206":18,
  "4301":4,"4302":4,"4303":22,"4304":22,
  // Ch.44-46 Wood
  "4401":4,"4402":4,"4403":4,"4404":4,"4405":4,"4406":4,"4407":4,
  "4408":8,"4409":14,"4410":14,"4411":14,"4412":14,"4413":14,"4414":14,
  "4415":8,"4416":14,"4417":14,"4418":14,"4419":18,"4420":18,"4421":14,
  // Ch.47-49 Paper & printed matter
  "4701":4,"4702":4,"4703":4,"4704":4,"4705":4,"4706":4,"4707":4,
  "4801":10,"4802":10,"4803":10,"4804":10,"4805":10,"4806":10,"4807":10,
  "4808":10,"4809":10,"4810":10,"4811":10,"4812":10,"4813":14,
  "4901":0,"4902":0,"4903":0,"4904":0,"4905":0,"4906":0,
  "4907":0,"4908":0,"4909":0,"4910":0,"4911":6,
  // Ch.50-63 Textiles & clothing — Dec.236/2025: telas 18%, prendas/confección 20%
  "5007":18,"5111":18,"5112":18,"5113":18,
  "5208":18,"5209":18,"5210":18,"5211":18,"5212":18,
  "5309":18,"5310":18,"5311":18,
  "5407":18,"5408":18,"5512":18,"5513":18,"5514":18,"5515":18,"5516":18,
  "5602":18,"5603":18,"5606":14,"5607":14,"5608":14,"5609":14,
  "5701":20,"5702":20,"5703":20,"5704":20,"5705":20,
  "5801":18,"5802":18,"5803":18,"5804":18,"5805":14,"5806":18,"5807":14,
  "5808":14,"5809":18,"5810":18,"5811":18,
  "5901":14,"5902":14,"5903":18,"5904":14,"5905":14,"5906":18,"5907":18,
  "5908":14,"5909":14,"5910":14,"5911":14,
  "6001":18,"6002":18,"6003":18,"6004":18,"6005":18,"6006":18,
  "6101":20,"6102":20,"6103":20,"6104":20,"6105":20,"6106":20,
  "6107":20,"6108":20,"6109":20,"6110":20,"6111":20,"6112":20,
  "6113":20,"6114":20,"6115":20,"6116":20,"6117":20,
  "6201":20,"6202":20,"6203":20,"6204":20,"6205":20,"6206":20,
  "6207":20,"6208":20,"6209":20,"6210":20,"6211":20,"6212":20,
  "6213":20,"6214":20,"6215":20,"6216":20,"6217":20,
  "6301":20,"6302":20,"6303":20,"6304":20,"6305":20,"6306":20,
  "6307":20,"6308":20,"6309":20,"6310":20,
  // Ch.64-67 Footwear & headgear
  "6401":20,"6402":20,"6403":20,"6404":20,"6405":20,"6406":18,
  "6501":18,"6502":18,"6503":18,"6504":18,"6505":18,"6506":18,"6507":18,
  "6601":28,"6602":28,"6603":28,
  "6701":20,"6702":18,"6703":18,"6704":18,
  // Ch.68-70 Stone, glass, ceramics
  "6801":8,"6802":8,"6803":8,"6804":8,"6805":8,"6806":8,
  "6901":10,"6902":10,"6903":10,"6904":10,"6905":10,"6906":10,
  "6907":18,"6908":18,"6909":10,"6910":18,
  "7001":10,"7002":10,"7003":12,"7004":12,"7005":12,"7006":12,"7007":14,
  "7008":14,"7009":18,"7010":14,"7011":12,"7013":20,"7014":14,
  // Ch.71 Precious metals & jewelry
  "7101":14,"7102":14,"7103":14,"7104":14,"7105":14,
  "7106":14,"7107":14,"7108":14,"7109":14,"7110":14,
  "7111":14,"7112":14,"7113":18,"7114":18,"7115":18,
  "7116":18,"7117":18,"7118":18,
  // Ch.72-83 Metals
  "7201":4,"7202":4,"7203":4,"7204":4,"7205":4,"7206":4,"7207":8,
  "7208":8,"7209":8,"7210":8,"7211":8,"7212":8,"7213":10,"7214":10,
  "7215":10,"7216":10,"7217":10,"7218":6,"7219":6,"7220":6,"7221":6,
  "7222":6,"7223":6,"7224":6,"7225":6,"7226":6,"7227":6,"7228":6,"7229":6,
  "7301":8,"7302":8,"7303":8,"7304":8,"7305":8,"7306":8,"7307":12,
  "7308":12,"7309":8,"7310":8,"7311":8,"7312":8,"7313":8,"7314":8,"7315":12,
  "7316":12,"7317":12,"7318":12,"7319":12,"7320":12,"7321":18,"7322":18,
  "7323":18,"7324":18,"7325":12,"7326":12,
  "7401":4,"7402":4,"7403":4,"7404":4,"7405":4,"7406":8,"7407":10,
  "7408":10,"7409":10,"7410":10,"7411":10,"7412":10,"7413":10,"7414":10,
  "7415":10,"7416":10,"7417":10,"7418":18,"7419":14,
  "7801":4,"7802":4,"7803":4,"7804":8,"7805":8,"7806":8,
  "7901":4,"7902":4,"7903":4,"7904":8,"7905":8,"7906":8,"7907":14,
  "8001":4,"8002":4,"8003":8,"8004":8,"8005":8,"8006":8,"8007":14,
  "8101":4,"8102":4,"8103":4,"8104":4,"8105":4,"8106":4,"8107":4,
  "8108":4,"8109":4,"8110":4,"8111":4,"8112":4,"8113":4,
  "8201":14,"8202":14,"8203":14,"8204":12,"8205":12,"8206":12,
  "8207":12,"8208":12,"8209":12,"8210":14,"8211":18,"8212":18,"8213":14,
  "8214":18,"8215":18,
  "8301":12,"8302":12,"8303":12,"8304":14,"8305":14,"8306":18,
  "8307":12,"8308":12,"8309":12,"8310":12,"8311":8,
  // Ch.84 Machinery & mechanical appliances
  "8401":2,"8402":8,"8403":8,"8404":8,"8405":8,"8406":6,
  "8407":12,"8408":12,"8409":14,"8410":8,"8411":4,
  "8412":8,"8413":8,"8414":8,"8415":20,"8416":8,"8417":8,
  "8418":20,"8419":12,"8420":12,"8421":8,"8422":12,"8423":12,
  "8424":8,"8425":12,"8426":8,"8427":12,"8428":12,"8429":14,
  "8430":8,"8431":14,"8432":8,"8433":8,"8434":8,"8435":8,
  "8436":8,"8437":8,"8438":8,"8439":8,"8440":8,"8441":8,
  "8442":8,"8443":14,"8444":8,"8445":8,"8446":8,"8447":8,
  "8448":8,"8449":8,"8450":20,"8451":8,"8452":18,"8453":8,
  "8454":6,"8455":6,"8456":8,"8457":8,"8458":8,"8459":8,
  "8460":8,"8461":8,"8462":8,"8463":8,"8464":8,"8465":8,
  "8466":8,"8467":12,"8468":8,"8469":12,"8470":12,
  "8471":0,"8472":14,"8473":0,"8474":8,"8475":8,
  "8476":12,"8477":8,"8478":8,"8479":8,"8480":8,
  "8481":12,"8482":12,"8483":12,"8484":8,"8485":8,
  // Ch.85 Electrical machinery & equipment
  "8501":14,"8502":14,"8503":14,"8504":14,"8505":14,
  "8506":12,"8507":14,"8508":20,"8509":20,"8510":20,
  "8511":14,"8512":16,"8513":16,"8514":8,"8515":8,
  "8516":20,"8517":0,"8518":20,"8519":12,"8520":12,
  "8521":14,"8522":12,"8523":16,"8524":0,"8525":16,
  "8526":16,"8527":20,"8528":16,"8529":12,"8530":12,
  "8531":12,"8532":12,"8533":8,"8534":12,"8535":12,
  "8536":12,"8537":12,"8538":12,"8539":14,"8540":14,
  "8541":8,"8542":0,"8543":12,"8544":12,"8545":12,
  "8546":8,"8547":8,"8548":8,
  // Ch.86-89 Transport equipment
  "8601":14,"8602":14,"8603":14,"8604":14,"8605":14,"8606":14,"8607":14,
  "8701":14,"8702":35,"8703":35,"8704":35,"8705":20,
  "8706":35,"8707":18,"8708":18,"8709":14,"8710":0,
  "8711":20,"8712":20,"8713":8,"8714":16,"8715":20,"8716":18,
  // Ch.88 Aeronáutica — AEC 0% (aeronaves, drones y partes)
  "8801":0,"8802":0,"8803":0,"8804":0,"8805":0,
  "8806":0,"8807":0,
  "8901":6,"8902":6,"8903":14,"8904":6,"8905":6,"8906":6,"8907":14,"8908":6,
  // Ch.90 Optics, photography, medical
  "9001":18,"9002":16,"9003":18,"9004":18,"9005":18,
  "9006":18,"9007":18,"9008":14,"9009":14,"9010":8,
  "9011":10,"9012":4,"9013":8,"9014":4,"9015":4,
  "9016":8,"9017":8,"9018":6,"9019":6,"9020":6,
  "9021":0,"9022":4,"9023":8,"9024":8,"9025":8,
  "9026":8,"9027":8,"9028":10,"9029":12,"9030":8,
  "9031":8,"9032":12,"9033":8,
  // Ch.91 Clocks & watches
  "9101":18,"9102":20,"9103":20,"9104":20,"9105":20,
  "9106":20,"9107":20,"9108":16,"9109":16,"9110":16,
  "9111":18,"9112":18,"9113":18,"9114":16,
  // Ch.92 Musical instruments
  "9201":16,"9202":16,"9203":16,"9204":16,"9205":16,
  "9206":16,"9207":16,"9208":16,"9209":16,
  // Ch.93 Arms — AEC extrazona 20% (el 0% es DII intrazona Mercosur, no aplica a China/USA)
  "9301":20,"9302":20,"9303":20,"9304":20,"9305":20,"9306":20,"9307":20,
  // Ch.94 Furniture
  "9401":18,"9402":18,"9403":18,"9404":18,"9405":18,"9406":18,
  // Ch.95 Toys & games
  "9501":20,"9502":20,"9503":20,"9504":20,"9505":20,
  "9506":20,"9507":18,"9508":20,
  // Ch.96 Miscellaneous manufactured articles
  "9601":16,"9602":16,"9603":16,"9604":16,"9605":18,
  "9606":18,"9607":18,"9608":18,"9609":18,"9610":18,
  "9611":18,"9612":18,"9613":18,"9614":18,"9615":18,
  "9616":20,"9617":18,"9618":18,
};

// ── NCM chapter-level descriptions ───────────────────────────────────────
export const CHAPTER_DESC = {
  "01":"Animales vivos","02":"Carnes","03":"Pescados","04":"Lácteos y huevos",
  "05":"Otros productos de origen animal","06":"Plantas vivas","07":"Hortalizas",
  "08":"Frutas","09":"Café, té y especias","10":"Cereales",
  "11":"Productos de molinería","12":"Semillas y oleaginosas","13":"Lacas y resinas",
  "14":"Materias trenzables","15":"Grasas y aceites","16":"Conservas",
  "17":"Azúcares","18":"Cacao","19":"Preparaciones cereales","20":"Conservas vegetales",
  "21":"Preparaciones alimenticias diversas","22":"Bebidas","23":"Residuos alimentarios",
  "24":"Tabaco","25":"Sal y piedra","26":"Minerales","27":"Combustibles",
  "28":"Productos químicos inorgánicos","29":"Productos químicos orgánicos",
  "30":"Productos farmacéuticos","31":"Abonos","32":"Pinturas","33":"Perfumería y cosméticos",
  "34":"Jabones y detergentes","35":"Colas y enzimas","36":"Pólvoras y explosivos",
  "37":"Productos fotográficos","38":"Productos químicos diversos",
  "39":"Plásticos","40":"Caucho","41":"Cueros","42":"Manufacturas de cuero y bolsos",
  "43":"Peletería","44":"Madera","45":"Corcho","46":"Manufacturas de cestería",
  "47":"Pasta de madera","48":"Papel","49":"Libros e impresos",
  "50":"Seda","51":"Lana","52":"Algodón","53":"Fibras vegetales",
  "54":"Filamentos sintéticos","55":"Fibras sintéticas discontinuas","56":"Guata y fieltro",
  "57":"Alfombras","58":"Tejidos especiales","59":"Tejidos impregnados",
  "60":"Tejidos de punto","61":"Prendas y accesorios de punto",
  "62":"Prendas y accesorios excepto punto","63":"Artículos textiles confeccionados",
  "64":"Calzado","65":"Sombreros y tocados","66":"Paraguas","67":"Plumas preparadas",
  "68":"Piedra, yeso y cemento","69":"Productos cerámicos","70":"Vidrio",
  "71":"Joyería y metales preciosos","72":"Fundición de hierro y acero",
  "73":"Manufacturas de hierro o acero","74":"Cobre","75":"Níquel","76":"Aluminio",
  "77":"Reservado","78":"Plomo","79":"Zinc","80":"Estaño","81":"Demás metales comunes",
  "82":"Herramientas y cuchillos","83":"Manufacturas de metal",
  "84":"Máquinas y reactores nucleares","85":"Máquinas y aparatos eléctricos",
  "86":"Locomotoras y material ferroviario","87":"Vehículos automóviles",
  "88":"Aeronaves y astronaves","89":"Barcos y embarcaciones",
  "90":"Instrumentos ópticos y médicos","91":"Relojería",
  "92":"Instrumentos musicales","93":"Armas y municiones","94":"Muebles",
  "95":"Juguetes y artículos de deporte","96":"Manufacturas diversas","97":"Obras de arte",
};

// ── Product keyword → rate mapping ───────────────────────────────────────
export const KEYWORD_RULES = [
  // Airsoft / armas de aire comprimido y réplicas (cap. 93 — AEC extrazona 20%)
  { k:["airsoft","air soft","replica airsoft","replica de arma","pistola airsoft","pistola de airsoft","rifle airsoft","rifle de airsoft","marcadora","paintball","gotcha","arma de aire comprimido","pistola de aire comprimido","rifle de aire comprimido","rifle de aire","pistola de aire","arma de co2","co2 pistola","balin","balines","postas","municion airsoft","bbs airsoft","bolitas airsoft"], hs:"9304.00.90", rate:20, desc:"Arma de aire comprimido / airsoft (réplica)" },
  // Computing (0%)
  { k:["laptop","notebook","computadora portatil","macbook","ultrabook"], hs:"8471.30.19", rate:0, desc:"Computadora portátil" },
  { k:["computadora de escritorio","desktop","pc escritorio","tower pc"], hs:"8471.41.90", rate:0, desc:"Computadora de escritorio" },
  { k:["tablet","ipad","tableta","ipad pro"], hs:"8471.30.11", rate:0, desc:"Tableta electrónica" },
  { k:["mouse","raton inalambrico","trackpad"], hs:"8471.60.50", rate:0, desc:"Mouse para computadora" },
  { k:["teclado","keyboard","teclado mecanico","teclado inalambrico"], hs:"8471.60.20", rate:0, desc:"Teclado" },
  { k:["pendrive","memoria usb","usb flash","disco ssd externo","disco rigido externo","disco duro externo"], hs:"8471.70.90", rate:0, desc:"Dispositivo de almacenamiento" },
  { k:["componente electronico","microprocesador","chip","circuito integrado","gpu","cpu","placa madre"], hs:"8542.31.00", rate:0, desc:"Componentes electrónicos" },
  { k:["impresora","printer","plotter"], hs:"8443.31.10", rate:14, desc:"Impresora" },
  { k:["scanner","escaner"], hs:"8443.31.90", rate:14, desc:"Escáner" },
  // Communications (0%)
  { k:["celular","smartphone","iphone","telefono inteligente","android","samsung galaxy","telefono movil"], hs:"8517.12.20", rate:0, desc:"Teléfono celular inteligente" },
  { k:["router","modem","wifi"], hs:"8517.62.90", rate:0, desc:"Equipo de red y comunicaciones" },
  // Audio/Video
  { k:["auricular","audifonos","headphone","earphone","airpod","auriculares inalambricos","in ear"], hs:"8518.30.00", rate:20, desc:"Auriculares" },
  { k:["parlante","altavoz","speaker","bocina","subwoofer","sonido"], hs:"8518.22.00", rate:20, desc:"Parlantes o altavoces" },
  { k:["television","televisor","smart tv","tv led","tv oled","tv 4k","pantalla plana"], hs:"8528.72.20", rate:16, desc:"Televisor" },
  { k:["monitor","pantalla para pc","display"], hs:"8528.52.00", rate:16, desc:"Monitor para computadora" },
  { k:["proyector","projector"], hs:"8528.61.00", rate:16, desc:"Proyector" },
  // Cameras
  { k:["camara fotografica","camara digital","camara mirrorless","camara reflex","dslr","camara canon","camara nikon"], hs:"9006.59.90", rate:18, desc:"Cámara fotográfica" },
  { k:["camara de video","videocamara","filmadora","go pro","gopro","action camera","camara accion"], hs:"9007.20.00", rate:18, desc:"Cámara de video" },
  { k:["lente fotografico","objetivo","lens fotografico"], hs:"9002.11.00", rate:10, desc:"Lente fotográfico" },
  // Drone
  { k:["drone","dron","cuadricoptero","uav","fpv"], hs:"8806.21.00", rate:0, desc:"Aeronave no tripulada (drone)" },
  // Watches
  { k:["smartwatch","apple watch","reloj inteligente","watch fitness","fitbit"], hs:"8517.62.30", rate:0, desc:"Reloj inteligente / smartwatch" },
  { k:["reloj pulsera","reloj de mano","watch","casio","seiko","tissot","swatch"], hs:"9102.12.00", rate:20, desc:"Reloj de pulsera" },
  // Clothing (35%)
  { k:["remera","camiseta","t-shirt","polo shirt"], hs:"6109.10.00", rate:20, desc:"Remeras y camisetas" },
  { k:["jean","jeans","pantalon de jean","denim"], hs:"6203.42.00", rate:20, desc:"Pantalones de jean" },
  { k:["pantalon","pantalones","trousers","chinos"], hs:"6203.42.90", rate:20, desc:"Pantalones" },
  { k:["buzo","sweater","sueter","pulover","chompa","sweatshirt","hoodie"], hs:"6110.20.00", rate:20, desc:"Buzos y suéteres" },
  { k:["campera","chaqueta","anorak","parka","impermeable","rompeviento","windbreaker"], hs:"6201.91.00", rate:20, desc:"Camperas y abrigos" },
  { k:["vestido","dress","frock"], hs:"6204.43.00", rate:20, desc:"Vestidos" },
  { k:["calza","leggins","legging","lycra","malla de baño"], hs:"6112.41.00", rate:20, desc:"Calzas y prendas deportivas" },
  { k:["ropa interior","lenceria","calzoncillo","bombacha","boxer","brassier","corset"], hs:"6107.11.00", rate:20, desc:"Ropa interior" },
  { k:["ropa","indumentaria","prendas de vestir","moda"], hs:"6211.33.00", rate:20, desc:"Prendas de vestir - indumentaria" },
  // Footwear (35%)
  { k:["zapatilla","zapatillas deportivas","sneakers","running","adidas","nike","puma"], hs:"6402.12.00", rate:20, desc:"Calzado deportivo / zapatillas" },
  { k:["zapato de cuero","calzado cuero","mocasin","zapato formal"], hs:"6403.99.90", rate:20, desc:"Calzado de cuero" },
  { k:["bota","botas"], hs:"6403.91.90", rate:20, desc:"Botas" },
  { k:["sandalia","ojota","chancleta","flip flop","hawaiana"], hs:"6404.19.90", rate:20, desc:"Sandalias y ojotas" },
  { k:["calzado","zapato","zapatos","shoes"], hs:"6402.99.90", rate:20, desc:"Calzado" },
  // Toys (20%)
  { k:["juguete","toy","lego","playset","figura de accion","muñeco","juego de mesa","puzzle","rompecabezas"], hs:"9503.00.10", rate:20, desc:"Juguetes" },
  { k:["peluche","oso de peluche","muñeca","barbie","stuffed animal"], hs:"9502.10.00", rate:20, desc:"Muñecas y peluches" },
  { k:["consola de juegos","playstation","ps4","ps5","xbox","nintendo switch"], hs:"9504.50.90", rate:20, desc:"Consola de videojuegos" },
  { k:["videojuego","video juego","juego digital","jogo"], hs:"9504.90.90", rate:20, desc:"Videojuego" },
  // Cosmetics & perfumery
  { k:["perfume","colonia","eau de toilette","eau de parfum","fragancia"], hs:"3303.00.20", rate:18, desc:"Perfume o agua de colonia" },
  { k:["maquillaje","cosmetico","lipstick","labial","rouge","base de maquillaje","corrector","sombra de ojos","blush","rimmel"], hs:"3304.99.90", rate:18, desc:"Cosméticos y maquillaje" },
  { k:["crema facial","crema hidratante","anti-age","antiedad","serum","toner","locion facial"], hs:"3304.99.10", rate:18, desc:"Cremas y cosméticos faciales" },
  { k:["shampoo","acondicionador","tratamiento capilar","mascara capilar","tinte para pelo","tinte cabello"], hs:"3305.10.00", rate:18, desc:"Productos para el cabello" },
  { k:["desodorante","antitranspirante"], hs:"3307.20.00", rate:18, desc:"Desodorante" },
  // Supplements
  { k:["suplemento","proteina en polvo","whey protein","creatina","aminoacidos","bcaa","pre workout","colageno","vitaminas","multivitaminico"], hs:"2106.90.90", rate:20, desc:"Suplemento alimenticio" },
  // Furniture
  { k:["silla","sillon de oficina","silla gamer","silla escritorio"], hs:"9401.30.00", rate:18, desc:"Sillas y asientos" },
  { k:["sofa","sofa cama","love seat","sectionario"], hs:"9401.61.00", rate:18, desc:"Sofás y sillones" },
  { k:["mesa","escritorio","desk","mesa de trabajo"], hs:"9403.30.00", rate:18, desc:"Mesas y escritorios" },
  { k:["estante","biblioteca","rack","organizador","estanteria"], hs:"9403.30.00", rate:18, desc:"Estantes y muebles de almacenamiento" },
  { k:["colchon","sommier"], hs:"9404.21.00", rate:18, desc:"Colchón" },
  { k:["mueble","furniture","mobiliario"], hs:"9403.20.00", rate:18, desc:"Muebles" },
  // Vehicles & transport
  { k:["bicicleta","bike","mountain bike","bicicleta electrica","bici electrica"], hs:"8712.00.90", rate:20, desc:"Bicicleta" },
  { k:["motocicleta","moto","scooter electrico","ciclomotor"], hs:"8711.30.00", rate:20, desc:"Motocicleta o scooter" },
  { k:["repuesto auto","accesorio auto","autopart","filtro aceite","pastilla freno"], hs:"8708.99.90", rate:18, desc:"Accesorios o repuestos para vehículos" },
  // Home appliances
  { k:["heladera","refrigerador","freezer"], hs:"8418.21.90", rate:20, desc:"Heladera / refrigerador" },
  { k:["lavaropa","lavarropa","lavadora","washing machine"], hs:"8450.11.10", rate:20, desc:"Lavarropas" },
  { k:["microondas","microwave"], hs:"8516.50.00", rate:20, desc:"Microondas" },
  { k:["aspiradora","robot aspiradora","vacuum cleaner"], hs:"8508.11.00", rate:20, desc:"Aspiradora" },
  { k:["plancha","iron"], hs:"8516.40.00", rate:20, desc:"Plancha de ropa" },
  { k:["ventilador","fan electrico"], hs:"8414.51.10", rate:20, desc:"Ventilador" },
  { k:["aire acondicionado","split","minisplit"], hs:"8415.10.90", rate:20, desc:"Aire acondicionado" },
  { k:["electrodomestico","appliance"], hs:"8516.60.90", rate:18, desc:"Electrodoméstico" },
  // Tools
  { k:["taladro","drill","amoladora","sierra electrica","sierra circular"], hs:"8467.21.00", rate:12, desc:"Herramientas eléctricas" },
  { k:["herramienta manual","destornillador","llave inglesa","pinza","alicate","martillo"], hs:"8205.59.00", rate:12, desc:"Herramientas manuales" },
  // Books & printed matter (0%)
  { k:["libro","novela","manual tecnico","enciclopedia","libro de texto"], hs:"4901.99.00", rate:0, desc:"Libros" },
  // Bags & luggage
  { k:["mochila","backpack","morral"], hs:"4202.12.10", rate:18, desc:"Mochilas" },
  { k:["maleta","valija","equipaje","trolley","carry on","luggage"], hs:"4202.12.90", rate:18, desc:"Valijas y equipaje" },
  { k:["cartera","bolso","handbag","purse"], hs:"4202.22.00", rate:18, desc:"Carteras y bolsos" },
  // Jewelry & accessories
  { k:["joya","joyeria","collar de oro","pulsera de oro","anillo de oro","pendiente de oro","aretes"], hs:"7113.19.00", rate:18, desc:"Joyería de metales preciosos" },
  { k:["bisuteria","joyeria de fantasia","collar","pulsera","anillo","aro","arete"], hs:"7117.19.00", rate:18, desc:"Bisutería y joyería de fantasía" },
  // Musical instruments
  { k:["guitarra","bajo electrico","ukelele","violin","cello"], hs:"9207.10.00", rate:16, desc:"Instrumento musical de cuerda" },
  { k:["teclado musical","piano digital","sintetizador","midi","bateria electronica"], hs:"9207.90.00", rate:16, desc:"Instrumento musical electrónico" },
  { k:["instrumento musical","flauta","saxofon","trompeta","clarinete","bateria acustica"], hs:"9205.10.00", rate:16, desc:"Instrumento musical" },
  // Pet supplies
  { k:["alimento para perro","alimento para gato","pet food","comida mascota","croquetas"], hs:"2309.10.00", rate:10, desc:"Alimentos para mascotas" },
  { k:["accesorio mascota","cama para perro","juguete mascota","collar perro"], hs:"9506.99.90", rate:18, desc:"Accesorios para mascotas" },
  // Power & chargers
  { k:["powerbank","power bank","bateria portatil","bateria externa"], hs:"8507.60.00", rate:14, desc:"Batería portátil / powerbank" },
  { k:["cargador","charger","adaptador de corriente","fuente de alimentacion"], hs:"8504.40.90", rate:14, desc:"Cargador o transformador eléctrico" },
  { k:["cable hdmi","cable usb","cable datos","cable carga"], hs:"8544.42.00", rate:12, desc:"Cables eléctricos y de datos" },
  // Optics
  { k:["anteojos de sol","lentes de sol","gafas de sol","sunglasses"], hs:"9004.10.00", rate:18, desc:"Anteojos de sol" },
  { k:["lentes opticos","anteojos de vista","gafas","armazon","frame optico"], hs:"9004.90.10", rate:18, desc:"Anteojos de vista" },
  { k:["lente de contacto","contact lens"], hs:"9001.30.00", rate:10, desc:"Lentes de contacto" },
  // Sports
  { k:["bicicleta spinning","equipamiento gym","pesas","mancuernas","cinta de correr","trotadora"], hs:"9506.91.00", rate:18, desc:"Equipamiento de gimnasio" },
  { k:["pelota","balon","balón de futbol","pelota de tenis","pelota de basquet"], hs:"9506.62.00", rate:18, desc:"Artículos deportivos - pelotas" },
  { k:["raqueta","raquetas","paddle"], hs:"9506.59.00", rate:18, desc:"Raquetas deportivas" },
  { k:["articulo deportivo","deporte","sports equipment"], hs:"9506.99.90", rate:18, desc:"Artículos deportivos" },
  // Medical
  { k:["medicamento","farmaceutico","medicina","pastilla","comprimido"], hs:"3004.90.99", rate:6, desc:"Medicamento o producto farmacéutico" },
  { k:["material medico","insumo medico","instrumental medico"], hs:"9018.90.90", rate:6, desc:"Material o insumo médico" },
  // Beauty devices
  { k:["depiladora laser","depiladora electrica","afeitadora electrica","maquina de afeitar"], hs:"8510.20.00", rate:20, desc:"Afeitadora o depiladora eléctrica" },
  { k:["secador de pelo","blow dryer","plancha de pelo"], hs:"8516.31.00", rate:20, desc:"Secador o plancha para el cabello" },
];

// ── NCM chapter default rates ─────────────────────────────────────────────
export const CHAPTER_RATES = {
  "01":2,"02":10,"03":10,"04":14,"05":4,"06":10,"07":10,"08":10,"09":10,"10":0,
  "11":0,"12":0,"13":8,"14":8,"15":10,"16":16,"17":12,"18":14,"19":16,"20":14,
  "21":16,"22":20,"23":10,"24":20,"25":0,"26":0,"27":4,"28":4,"29":4,"30":6,
  "31":4,"32":8,"33":18,"34":12,"35":8,"36":6,"37":8,"38":6,"39":12,"40":8,
  "41":4,"42":18,"43":18,"44":10,"45":8,"46":14,"47":4,"48":10,"49":0,
  "50":18,"51":18,"52":18,"53":18,"54":18,"55":18,"56":14,"57":20,"58":18,
  "59":18,"60":18,"61":20,"62":20,"63":20,"64":20,"65":18,"66":20,"67":18,
  "68":10,"69":14,"70":14,"71":14,"72":8,"73":10,"74":8,"75":4,"76":8,
  "77":0,"78":4,"79":4,"80":4,"81":4,"82":12,"83":12,
  "84":8,"85":12,"86":14,"87":20,"88":0,"89":6,
  "90":8,"91":18,"92":16,"93":20,"94":18,"95":20,"96":16,"97":0,
};

