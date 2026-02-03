import { SignInButton } from '@clerk/nextjs'


const Home = () => {
    return (
        <div className='flex justify-center items-center h-screen'>
            <SignInButton mode='modal' fallbackRedirectUrl={'/todo'} forceRedirectUrl={'/todo'}>
                <button className='bg-blue-500 text-white px-4 py-2 rounded-md'>
                    Activate System
                </button>
            </SignInButton>
        </div>
    )
}
export default Home;