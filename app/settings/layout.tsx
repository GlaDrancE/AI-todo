import React from 'react'
import { currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';

const SettingsLayout = async ({ children }: { children: React.ReactNode }) => {
    const user = await currentUser();
    return (
        <>
            <header className='flex justify-between items-center p-4 bg-slate-900/50 backdrop-blur-md border-b border-purple-500/20'>
                <div className='flex items-center gap-6'>
                    <h1 className='text-purple-200'>Hello, {user?.firstName}</h1>
                    <nav className='flex gap-4'>
                        <Link href='/todo' className='text-purple-300 hover:text-purple-100 transition-colors'>
                            Tasks
                        </Link>
                        <Link href='/settings' className='text-purple-300 hover:text-purple-100 transition-colors'>
                            Settings
                        </Link>
                    </nav>
                </div>
                <UserButton />
            </header>
            <main>
                {children}
            </main>
        </>
    )
}
export default SettingsLayout;

