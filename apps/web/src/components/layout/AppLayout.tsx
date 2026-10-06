import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ToastContainer } from '../ui'
export function AppLayout(){
 const [menu,setMenu]=useState(false)
 return <div className="app-layout"><header className="mobile-header"><strong>Redak Esport</strong><button aria-label={menu?'Fermer le menu':'Ouvrir le menu'} aria-expanded={menu} onClick={()=>setMenu(!menu)}>☰</button></header>{menu&&<button className="menu-backdrop" aria-label="Fermer le menu" onClick={()=>setMenu(false)}/>}<div className={`sidebar-wrap ${menu?'is-open':''}`}><Sidebar onNavigate={()=>setMenu(false)}/></div><main className="app-main"><Outlet/></main><ToastContainer/></div>
}
