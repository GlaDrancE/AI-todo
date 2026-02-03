import React from 'react'
import { currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';

const Dashboard = async ({ children }: { children: React.ReactNode }) => {
    const user = await currentUser();
    return (
        <>
            <header className='flex justify-between items-center p-4'>
                <h1>Hello, {user?.firstName}</h1>
                <UserButton />
            </header>
            <main>
                {children}
            </main>
        </>
    )
}
export default Dashboard;