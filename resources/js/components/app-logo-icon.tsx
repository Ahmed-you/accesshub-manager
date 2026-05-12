import accessHubLogo from '../../../image.png';
import { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon({ alt = 'AccessHub', className, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img {...props} src={accessHubLogo} alt={alt} className={className} />
    );
}
