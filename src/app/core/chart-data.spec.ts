import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ChartDataService } from './chart-data.service';

describe('ChartDataService', () => {
  let service: ChartDataService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(ChartDataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getWeeklyBookings should call API with params and return chart-ready JSON', () => {
    const vendor = 'Vendor A';
    const from = '2025-01-01';
    const to = '2025-03-31';

    const mockResponse = {
      categories: ['Week 1', 'Week 2'],
      series: [
        { name: 'Bookings', data: [16, 21] },
        { name: 'Lost Opportunity', data: [3, 4] }
      ]
    };

    service.getWeeklyBookings(vendor, from, to).subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(r => r.url === '/api/weekly-bookings');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('vendor')).toBe(vendor);
    expect(req.request.params.get('from')).toBe(from);
    expect(req.request.params.get('to')).toBe(to);

    req.flush(mockResponse);
  });
});
