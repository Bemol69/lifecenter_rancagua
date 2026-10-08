import sharp from 'sharp';
const S=400, mask=Buffer.from(`<svg width="${S}" height="${S}"><circle cx="${S/2}" cy="${S/2}" r="${S/2}"/></svg>`);
const buf=await sharp('img/flyer-martes-gatunos.jpg').extract({left:52,top:42,width:S,height:S}).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
await sharp(buf).resize(512).png().toFile('img/logo.png');
await sharp(buf).resize(64).png().toFile('img/favicon.png');
