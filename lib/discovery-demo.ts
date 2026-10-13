// LOCAL DEMO ONLY. AI images illustrate fictional beauty outcomes, not verified client work.
import type { SavedCompareArtist } from '@/components/SavedCompareMobile';
const artists: SavedCompareArtist[] = [
 ['emma','Emma L.','Lash Artist','Tulsa',115,'lash'],['ava','Ava M.','Hair Stylist','Broken Arrow',140,'hair'],['mia','Mia R.','Nail Technician','Tulsa',65,'nail'],['lily','Lily W.','Aesthetician','Tulsa',90,'facial'],['zoe','Zoe B.','Brow Artist','Tulsa',55,'brow'],['ella','Ella K.','Makeup Artist','Tulsa',110,'makeup']
].map(([id,name,category,location,price,image])=>({id:`demo-artist-${id}`,name:String(name),category:String(category),location:String(location),price_start:Number(price),profile_image_url:`/demo/discover/${image}-outcome.png`,distance:null,services:[],availability:null}));
const looks = artists.map((artist,i)=>({id:`demo-look-${artist.id}`,artistId:artist.id,title:['Wispy lash inspiration','Soft dimension','Pearl manicure','Skin reset','Soft sculpted brows','Evening glow'][i],image:artist.profile_image_url!,price:artist.price_start,demo:true,signal:'AI demo outcome',duration:[120,150,60,60,45,90][i]}));

// Local service summaries for the existing comparison renderer.
for (const artist of artists) {
 const look=looks.find(l=>l.artistId===artist.id)!;
 artist.services=[{id:`service-${artist.id}`,artist_id:artist.id,service_name:look.title,price:look.price,duration:look.duration}];
}

export const discoveryDemo = { catalog: looks, artists };
