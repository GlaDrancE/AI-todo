'use client'

import { SignInButton, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const Home = () => {
    const { isSignedIn, isLoaded } = useUser()
    const router = useRouter()

    // If user is already logged in, redirect to /todo automatically
    useEffect(() => {
        if (isLoaded && isSignedIn) {
            router.push('/todo')
        }
    }, [isLoaded, isSignedIn, router])

    const handleClick = () => {
        if (isSignedIn) {
            router.push('/todo')
        }
    }

    return (
        <div className='flex justify-center items-center h-screen'>
            {isLoaded && !isSignedIn ? (
                <SignInButton mode='modal' fallbackRedirectUrl={'/todo'} forceRedirectUrl={'/todo'}>
                    <button className='bg-blue-500 text-white px-4 py-2 rounded-md'>
                        Activate System
                    </button>
                </SignInButton>
            ) : (
                <button
                    onClick={handleClick}
                    className='bg-blue-500 text-white px-4 py-2 rounded-md'
                >
                    Activate System
                </button>
            )}
        </div>
    )
}
export default Home;