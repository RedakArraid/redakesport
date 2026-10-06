import { Link } from 'react-router-dom'
export function RouteError(){return <main style={{padding:40,maxWidth:600,margin:'auto'}}><h1>Cette page n’a pas pu être chargée</h1><p>Réessaie ou reviens à l’accueil.</p><button onClick={()=>window.location.reload()}>Réessayer</button> <Link to="/">Accueil</Link></main>}
