const FieldWrapper = ({ label, required, error, children, className = "" }) => (
    <div className={`bg-[#E2E6F999] rounded-lg py-0.5 md:py-1 md:pt-2 p-2 md:p-3 flex flex-col gap-0.5 md:gap-0 ${className}`}>
        <label className="text-xs md:text-sm font-light text-gray-700">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
        {error ? <p className="text-xs text-red-600 mt-1">{error}</p> : null}
    </div>
);

export default FieldWrapper;