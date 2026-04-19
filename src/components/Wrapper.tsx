const Wrapper = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={`w-full max-w-[1480px] px-6 md:px-12 mx-auto ${className || ""}`}
    >
      {children}
    </div>
  );
};

export default Wrapper;
