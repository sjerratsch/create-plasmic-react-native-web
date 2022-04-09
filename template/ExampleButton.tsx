import React from "react";
import { TouchableOpacity, Text } from "react-native";

type ExampleButtonProps = { className?: string; children: React.ReactNode };
export const ExampleButton = React.forwardRef(
    ({ className, children, ...props }: ExampleButtonProps, ref) => {
        return (
            <TouchableOpacity ref={ref}>
                <Text className={className}>{children}</Text>
            </TouchableOpacity>
        );
    }
);
