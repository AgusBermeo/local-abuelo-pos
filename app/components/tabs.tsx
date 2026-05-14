type Tab = {
    label: string;
    content: React.ReactNode;
}

export default function Tabs({
    tabs,
    activeTab,
    setActiveTab
}: {
    tabs: Tab[];
    activeTab: number;
    setActiveTab: (index: number) => void;
}) {
    return (
        <div className={`flex bg-amber-950`}>
            {tabs.map((tab, index) => (
                <button 
                    key={tab.label} 
                    onClick={() => setActiveTab(index)}
                    className={`flex-1 py-4 font-semibold cursor-pointer border-b-2 transition-colors ${
                        activeTab === index 
                            ? "text-amber-500 border-amber-500 bg-amber-900" 
                            : "text-amber-800 hover:text-amber-500 border-amber-700"
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}